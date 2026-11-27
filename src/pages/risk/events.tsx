import { useMemo, useState } from "react";
import { ClipboardList, History, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button, Dropdown, Modal, Table } from "@heroui/react";

import { useAuth } from "@/provider";
import { useRiskData, riskId } from "@/lib/risk-store";
import { useAccidentTypes, useEvalMethods, useRiskLevels } from "@/lib/dict-store";
import {
  evalParams, evaluateRisk, evalMethodLabels, riskLevelLabels,
  type EvalMethod, type RiskEvent, type RiskEvaluation, type RiskLevel,
} from "@/lib/risk-types";
import { RiskEmpty, RiskLevelBadge, RiskShell, StatCard } from "./risk-shared";
import { Field, FieldGrid, SelectField, TextAreaField } from "./risk-fields";

const blank = (tenantId: string, unitId: string): RiskEvent => ({
  id: "", tenantId, unitId, name: "", accidentTypeCode: "", currentLevel: "blue",
  currentEvaluationId: "", status: "active", description: "", createdAt: "", updatedAt: "",
});

/** 评价参数表单：按所选方法动态渲染，实时计算等级 */
function EvaluationEditor({
  method,
  values,
  directLevel,
  onMethod,
  onValue,
  onDirectLevel,
}: {
  method: EvalMethod;
  values: Record<string, number>;
  directLevel: RiskLevel;
  onMethod: (v: EvalMethod) => void;
  onValue: (k: string, v: number) => void;
  onDirectLevel: (v: RiskLevel) => void;
}) {
  const evalMethods = useEvalMethods();
  const riskLevels = useRiskLevels();
  const result = evaluateRisk(method, values, directLevel);

  return (
    <div className="border-separator rounded-xl border p-4">
      <p className="text-foreground mb-3 text-sm font-semibold">风险评价</p>
      <FieldGrid>
        <SelectField label="评价方法" value={method} onChange={(v) => onMethod(v as EvalMethod)} options={evalMethods} />
        {method === "direct" ? (
          <SelectField label="直接判定等级" value={directLevel} onChange={(v) => onDirectLevel(v as RiskLevel)} options={riskLevels} />
        ) : evalParams[method as keyof typeof evalParams].map((param) => (
          <Field key={param.key} label={param.label} value={values[param.key] ?? 1}
            onChange={(v) => onValue(param.key, Number(v) || 0)} placeholder={param.hint} type="number" />
        ))}
      </FieldGrid>
      <div className="bg-default/40 mt-3 flex items-center justify-between rounded-xl p-3">
        <span className="text-muted text-xs">{evalMethodLabels[method]} · {method === "direct" ? "人工判定" : `计算值 ${result.score}`}</span>
        <RiskLevelBadge level={result.level} />
      </div>
    </div>
  );
}

export default function RiskEventsPage() {
  const { user } = useAuth();
  const tenantId = user?.workspaceId ?? null;
  const { db, mutate } = useRiskData(tenantId);
  const accidentTypes = useAccidentTypes();
  const unitMap = useMemo(() => Object.fromEntries(db.units.map((u) => [u.id, `${u.code} ${u.name}`])), [db.units]);

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RiskEvent | null>(null);
  const [form, setForm] = useState<RiskEvent>(blank(tenantId ?? "", ""));
  const [method, setMethod] = useState<EvalMethod>("LS");
  const [values, setValues] = useState<Record<string, number>>({ L: 3, S: 3, E: 3, C: 10, M: 3 });
  const [directLevel, setDirectLevel] = useState<RiskLevel>("yellow");
  const [validUntil, setValidUntil] = useState("");
  const [evaluator, setEvaluator] = useState("");
  const [deleting, setDeleting] = useState<RiskEvent | null>(null);
  const [historyEvent, setHistoryEvent] = useState<RiskEvent | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.events.filter((e) => !q || [e.name, unitMap[e.unitId], riskLevelLabels[e.currentLevel]].some((v) => (v ?? "").toLowerCase().includes(q)));
  }, [db.events, query, unitMap]);

  const levelCounts = useMemo(() => {
    const counts = { red: 0, orange: 0, yellow: 0, blue: 0 };
    db.events.forEach((e) => (counts[e.currentLevel] += 1));
    return counts;
  }, [db.events]);

  const setField = <K extends keyof RiskEvent>(key: K, value: RiskEvent[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank(tenantId ?? "", db.units[0]?.id ?? "") });
    setMethod("LS"); setValues({ L: 3, S: 3, E: 3, C: 10, M: 3 }); setDirectLevel("yellow");
    setValidUntil(""); setEvaluator(user?.name ?? "");
    setDialogOpen(true);
  };
  const openEdit = (event: RiskEvent) => {
    setEditing(event); setForm({ ...event });
    const latest = db.evaluations.filter((ev) => ev.eventId === event.id).sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))[0];
    if (latest) { setMethod(latest.method); setValues({ ...latest.values }); setValidUntil(latest.validUntil); setEvaluator(latest.evaluator); }
    else { setMethod("LS"); setValues({ L: 3, S: 3, E: 3, C: 10, M: 3 }); setValidUntil(""); setEvaluator(user?.name ?? ""); }
    setDialogOpen(true);
  };
  const save = async () => {
    if (!tenantId || !form.name.trim() || !form.unitId) return;
    const now = new Date().toISOString().slice(0, 10);
    const result = evaluateRisk(method, values, directLevel);
    const evalId = riskId("RE");
    const evaluation: RiskEvaluation = {
      id: evalId, tenantId, eventId: editing?.id ?? riskId("EV"), method, values: { ...values },
      score: result.score, level: result.level, validUntil, evaluator, remark: "", evaluatedAt: now,
    };
    const eventId = evaluation.eventId;
    const record: RiskEvent = {
      ...form, id: eventId, tenantId, currentLevel: result.level, currentEvaluationId: evalId,
      createdAt: editing?.createdAt ?? now, updatedAt: now,
    };
    await mutate((current) => ({
      ...current,
      events: editing ? current.events.map((e) => (e.id === editing.id ? record : e)) : [...current.events, record],
      evaluations: [...current.evaluations.filter((ev) => ev.eventId !== (editing?.id ?? eventId)), evaluation],
    }));
    setDialogOpen(false);
  };
  const remove = async () => {
    if (!deleting) return;
    await mutate((current) => ({
      ...current,
      events: current.events.filter((e) => e.id !== deleting.id),
      evaluations: current.evaluations.filter((ev) => ev.eventId !== deleting.id),
      measures: current.measures.filter((m) => m.eventId !== deleting.id),
    }));
    setDeleting(null);
  };

  const histories = historyEvent
    ? db.evaluations.filter((ev) => ev.eventId === historyEvent.id).sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))
    : [];

  return (
    <RiskShell title="风险事件管理" description="针对每个单元分析可能产生的风险，采用 LS / LEC / MES 或直接判定法评价等级，并保留历史评价记录。"
      actions={<div className="mb-5 flex justify-end"><Button variant="primary" onPress={openCreate}><Plus className="size-4" /> 新增风险事件</Button></div>}>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="风险事件总数" value={db.events.length} accent="purple" />
        <StatCard label="重大风险（红）" value={levelCounts.red} accent="red" />
        <StatCard label="较大风险（橙）" value={levelCounts.orange} accent="amber" />
        <StatCard label="一般及以下" value={levelCounts.yellow + levelCounts.blue} accent="green" />
      </div>

      <div className="neon-card rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <label className="border-separator bg-field-background focus-within:border-accent flex max-w-xs items-center gap-2 rounded-xl border px-3 py-2 transition-colors">
            <Search className="text-muted size-4 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索事件 / 单元 / 等级"
              className="text-foreground placeholder:text-muted w-full bg-transparent text-sm outline-none" />
          </label>
        </div>
        {filtered.length === 0 ? <RiskEmpty text="暂无风险事件，先添加单元后再进行风险分析。" /> : (
          <Table aria-label="风险事件列表" variant="secondary">
            <Table.Header>
              <Table.Column>风险事件</Table.Column>
              <Table.Column>所属单元</Table.Column>
              <Table.Column>事故类型</Table.Column>
              <Table.Column>评价方法</Table.Column>
              <Table.Column>当前等级</Table.Column>
              <Table.Column>有效期至</Table.Column>
              <Table.Column><span className="sr-only">操作</span></Table.Column>
            </Table.Header>
            <Table.Body>
              {filtered.map((event) => {
                const latest = db.evaluations.find((ev) => ev.id === event.currentEvaluationId);
                return (
                  <Table.Row key={event.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <span className="bg-accent/12 text-accent flex size-8 items-center justify-center rounded-lg"><ClipboardList className="size-4" /></span>
                        <span className="text-foreground text-sm font-medium">{event.name}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-muted text-xs">{unitMap[event.unitId] ?? "—"}</Table.Cell>
                    <Table.Cell className="text-muted text-xs">{event.accidentTypeCode || "—"}</Table.Cell>
                    <Table.Cell className="text-muted text-xs">{latest ? evalMethodLabels[latest.method] : "—"}</Table.Cell>
                    <Table.Cell><RiskLevelBadge level={event.currentLevel} /></Table.Cell>
                    <Table.Cell className="text-muted text-xs">{latest?.validUntil || "长期"}</Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1">
                        <Button isIconOnly size="sm" variant="ghost" aria-label={`历史评价 ${event.name}`} onPress={() => setHistoryEvent(event)}>
                          <History className="size-4" />
                        </Button>
                        <Dropdown>
                          <Dropdown.Trigger className="text-muted hover:text-accent rounded-lg p-1" aria-label={`操作 ${event.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Dropdown.Trigger>
                          <Dropdown.Popover placement="bottom end">
                            <Dropdown.Menu aria-label="事件操作">
                              <Dropdown.Item id="edit" textValue="编辑" onAction={() => openEdit(event)}><Pencil className="size-4" /> 编辑 / 重新评价</Dropdown.Item>
                              <Dropdown.Item id="delete" textValue="删除" variant="danger" onAction={() => setDeleting(event)}><Trash2 className="size-4" /> 删除</Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown.Popover>
                        </Dropdown>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </div>

      <Modal isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-2xl">
          <Modal.Header><Modal.Heading>{editing ? "编辑风险事件" : "新增风险事件"}</Modal.Heading></Modal.Header>
          <Modal.Body>
            <div className="space-y-4">
              <FieldGrid>
                <SelectField label="所属分析单元" value={form.unitId} onChange={(v) => setField("unitId", v)}
                  options={db.units.map((u) => ({ value: u.id, label: `${u.code} ${u.name}` }))} />
                <Field label="风险事件名称" value={form.name} onChange={(v) => setField("name", v)} placeholder="如：高炉炉前作业灼烫风险" required />
                <SelectField label="事故类型" value={form.accidentTypeCode} onChange={(v) => setField("accidentTypeCode", v)} options={accidentTypes} />
                <Field label="评价有效期至" value={validUntil} onChange={setValidUntil} type="date" />
                <Field label="评价人" value={evaluator} onChange={setEvaluator} placeholder="评价负责人" />
                <SelectField label="状态" value={form.status} onChange={(v) => setField("status", v as RiskEvent["status"])}
                  options={[{ value: "active", label: "启用" }, { value: "inactive", label: "停用" }]} />
              </FieldGrid>
              <EvaluationEditor method={method} values={values} directLevel={directLevel}
                onMethod={setMethod} onValue={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))} onDirectLevel={setDirectLevel} />
              <TextAreaField label="事件描述" value={form.description} onChange={(v) => setField("description", v)} placeholder="风险来源、触发条件等（选填）" />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setDialogOpen(false)}>取消</Button>
            <Button variant="primary" onPress={save} isDisabled={!form.name.trim() || !form.unitId}>保存并评价</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      {/* 历史评价记录 */}
      <Modal isOpen={!!historyEvent} onOpenChange={(open) => !open && setHistoryEvent(null)}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-2xl">
          <Modal.Header><Modal.Heading>历史评价记录 · {historyEvent?.name}</Modal.Heading></Modal.Header>
          <Modal.Body>
            {histories.length === 0 ? <RiskEmpty text="暂无评价记录。" /> : (
              <Table aria-label="历史评价记录" variant="secondary">
                <Table.Header>
                  <Table.Column>评价日期</Table.Column>
                  <Table.Column>方法</Table.Column>
                  <Table.Column>计算值</Table.Column>
                  <Table.Column>等级</Table.Column>
                  <Table.Column>有效期至</Table.Column>
                  <Table.Column>评价人</Table.Column>
                </Table.Header>
                <Table.Body>
                  {histories.map((ev) => (
                    <Table.Row key={ev.id}>
                      <Table.Cell className="text-xs">{ev.evaluatedAt}</Table.Cell>
                      <Table.Cell className="text-muted text-xs">{evalMethodLabels[ev.method]}</Table.Cell>
                      <Table.Cell className="text-muted text-xs">{ev.method === "direct" ? "—" : ev.score}</Table.Cell>
                      <Table.Cell><RiskLevelBadge level={ev.level} /></Table.Cell>
                      <Table.Cell className="text-muted text-xs">{ev.validUntil || "长期"}</Table.Cell>
                      <Table.Cell className="text-muted text-xs">{ev.evaluator || "—"}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </Modal.Body>
          <Modal.Footer><Button variant="tertiary" onPress={() => setHistoryEvent(null)}>关闭</Button></Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      <Modal isOpen={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-md">
          <Modal.Header><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
          <Modal.Body><p className="text-muted text-sm">确定删除「{deleting?.name}」吗？其评价记录与管控措施将一并删除。</p></Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setDeleting(null)}>取消</Button>
            <Button variant="danger" onPress={remove}>确认删除</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>
    </RiskShell>
  );
}
