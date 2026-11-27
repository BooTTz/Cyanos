import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Button, Dropdown, Modal, Table } from "@heroui/react";

import { useAuth } from "@/provider";
import { useRiskData, riskId } from "@/lib/risk-store";
import { useControlCategories, useControlCategoryIds, useDictLabels } from "@/lib/dict-store";
import type { RiskMeasure } from "@/lib/risk-types";
import { RiskEmpty, RiskQuickNav, RiskShell, StatCard } from "./risk-shared";
import { Field, FieldGrid, SelectField, TextAreaField } from "./risk-fields";

const blank = (tenantId: string, eventId: string): RiskMeasure => ({
  id: "", tenantId, eventId, category1: "", category2: "", category3: "",
  content: "", departmentName: "", responsibleName: "", frequency: "",
  status: "active", createdAt: "", updatedAt: "",
});

export default function RiskMeasuresPage() {
  const { user } = useAuth();
  const tenantId = user?.workspaceId ?? null;
  const { db, mutate } = useRiskData(tenantId);
  const cat1 = useControlCategories(null);
  const categoryIds = useControlCategoryIds();
  const catLabels = useDictLabels("CONTROL_CATEGORY");
  const eventMap = useMemo(() => Object.fromEntries(db.events.map((e) => [e.id, e.name])), [db.events]);

  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RiskMeasure | null>(null);
  const [form, setForm] = useState<RiskMeasure>(blank(tenantId ?? "", ""));
  const [deleting, setDeleting] = useState<RiskMeasure | null>(null);

  // 二级选项：根据一级字典项的 id 作为 parentId；三级同理
  const cat2 = useControlCategories(form.category1 ? categoryIds[form.category1] ?? "__none__" : "__none__");
  const cat3 = useControlCategories(form.category2 ? categoryIds[form.category2] ?? "__none__" : "__none__");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.measures.filter((m) =>
      (!q || [m.content, eventMap[m.eventId], catLabels[m.category1], m.departmentName].some((v) => (v ?? "").toLowerCase().includes(q))) &&
      (catFilter === "all" || m.category1 === catFilter),
    );
  }, [db.measures, query, eventMap, catLabels, catFilter]);

  const setField = <K extends keyof RiskMeasure>(key: K, value: RiskMeasure[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank(tenantId ?? "", db.events[0]?.id ?? "") });
    setDialogOpen(true);
  };
  const openEdit = (m: RiskMeasure) => { setEditing(m); setForm({ ...m }); setDialogOpen(true); };
  const save = async () => {
    if (!tenantId || !form.content.trim() || !form.eventId) return;
    const now = new Date().toISOString().slice(0, 10);
    const record: RiskMeasure = {
      ...form, id: editing?.id ?? riskId("RM"), tenantId,
      createdAt: editing?.createdAt ?? now, updatedAt: now,
    };
    await mutate((current) => ({
      ...current,
      measures: editing ? current.measures.map((m) => (m.id === editing.id ? record : m)) : [...current.measures, record],
    }));
    setDialogOpen(false);
  };
  const remove = async () => {
    if (!deleting) return;
    await mutate((current) => ({ ...current, measures: current.measures.filter((m) => m.id !== deleting.id) }));
    setDeleting(null);
  };

  return (
    <RiskShell title="管控措施管理" description="为风险事件登记管控措施，按国标分类目录1/2与用户自定义分类3三级归档。"
      actions={<div className="mb-5 flex justify-end"><Button variant="primary" onPress={openCreate}><Plus className="size-4" /> 新增措施</Button></div>}>
      <RiskQuickNav />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="措施总数" value={db.measures.length} accent="purple" />
        <StatCard label="分类目录" value={cat1.length} hint="国标一级分类" accent="green" />
        <StatCard label="覆盖事件" value={new Set(db.measures.map((m) => m.eventId)).size} accent="blue" />
      </div>

      <div className="neon-card rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="border-separator bg-field-background focus-within:border-accent flex max-w-xs items-center gap-2 rounded-xl border px-3 py-2 transition-colors">
            <Search className="text-muted size-4 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索措施内容 / 事件 / 部门"
              className="text-foreground placeholder:text-muted w-full bg-transparent text-sm outline-none" />
          </label>
          <div className="border-separator text-muted flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
            一级分类
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="bg-transparent text-sm outline-none">
              <option value="all">全部</option>
              {cat1.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? <RiskEmpty text="暂无管控措施，点击「新增措施」为风险事件登记。" /> : (
          <Table aria-label="管控措施列表" variant="secondary">
            <Table.Header>
              <Table.Column>措施内容</Table.Column>
              <Table.Column>所属风险事件</Table.Column>
              <Table.Column>分类（1 / 2 / 3）</Table.Column>
              <Table.Column>责任部门 / 人</Table.Column>
              <Table.Column>执行频次</Table.Column>
              <Table.Column>状态</Table.Column>
              <Table.Column><span className="sr-only">操作</span></Table.Column>
            </Table.Header>
            <Table.Body>
              {filtered.map((m) => (
                <Table.Row key={m.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <span className="bg-success/12 text-success flex size-8 items-center justify-center rounded-lg"><ShieldCheck className="size-4" /></span>
                      <span className="text-foreground max-w-[280px] text-sm">{m.content}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-muted text-xs">{eventMap[m.eventId] ?? "—"}</Table.Cell>
                  <Table.Cell className="text-xs">
                    <span className="text-muted">
                      {catLabels[m.category1] ?? "—"}
                      {m.category2 && <span className="block pl-2 text-[11px]">↳ {catLabels[m.category2] ?? "—"}</span>}
                      {m.category3 && <span className="block pl-4 text-[11px]">↳ {catLabels[m.category3] ?? "—"}</span>}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="text-muted text-xs">{m.departmentName || "—"} / {m.responsibleName || "—"}</Table.Cell>
                  <Table.Cell className="text-muted text-xs">{m.frequency || "—"}</Table.Cell>
                  <Table.Cell>
                    <span className={`text-xs ${m.status === "active" ? "text-success" : "text-muted"}`}>
                      {m.status === "active" ? "执行中" : "已停用"}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Dropdown>
                      <Dropdown.Trigger className="text-muted hover:text-accent rounded-lg p-1" aria-label={`操作措施`}>
                        <MoreHorizontal className="size-4" />
                      </Dropdown.Trigger>
                      <Dropdown.Popover placement="bottom end">
                        <Dropdown.Menu aria-label="措施操作">
                          <Dropdown.Item id="edit" textValue="编辑" onAction={() => openEdit(m)}><Pencil className="size-4" /> 编辑</Dropdown.Item>
                          <Dropdown.Item id="delete" textValue="删除" variant="danger" onAction={() => setDeleting(m)}><Trash2 className="size-4" /> 删除</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      <Modal isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-2xl">
          <Modal.Header><Modal.Heading>{editing ? "编辑管控措施" : "新增管控措施"}</Modal.Heading></Modal.Header>
          <Modal.Body>
            <div className="space-y-4">
              <FieldGrid>
                <SelectField label="所属风险事件" value={form.eventId} onChange={(v) => setField("eventId", v)}
                  options={db.events.map((e) => ({ value: e.id, label: e.name }))} />
                <SelectField label="分类1（国标目录）" value={form.category1}
                  onChange={(v) => setField("category1", v)} options={cat1} />
                <SelectField label="分类2（国标子类）" value={form.category2}
                  onChange={(v) => { setField("category2", v); setField("category3", ""); }} options={cat2} />
                <SelectField label="分类3（自定义）" value={form.category3}
                  onChange={(v) => setField("category3", v)} options={cat3} />
                <Field label="责任部门" value={form.departmentName} onChange={(v) => setField("departmentName", v)} placeholder="如：安环部" />
                <Field label="责任人" value={form.responsibleName} onChange={(v) => setField("responsibleName", v)} />
                <Field label="执行频次" value={form.frequency} onChange={(v) => setField("frequency", v)} placeholder="如：每班一次 / 每日 / 每周" />
                <SelectField label="状态" value={form.status} onChange={(v) => setField("status", v as RiskMeasure["status"])}
                  options={[{ value: "active", label: "执行中" }, { value: "inactive", label: "已停用" }]} />
              </FieldGrid>
              <TextAreaField label="措施内容（必填）" value={form.content} onChange={(v) => setField("content", v)} placeholder="如：安装温度监测报警装置，超温自动联锁停机" />
              <p className="text-muted text-[11px]">分类3 为自定义三级目录，可在「数据字典 → 管控措施分类目录」中按需扩展。</p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setDialogOpen(false)}>取消</Button>
            <Button variant="primary" onPress={save} isDisabled={!form.content.trim() || !form.eventId}>保存</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      <Modal isOpen={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-md">
          <Modal.Header><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
          <Modal.Body><p className="text-muted text-sm">确定删除这条管控措施吗？此操作不可恢复。</p></Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setDeleting(null)}>取消</Button>
            <Button variant="danger" onPress={remove}>确认删除</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>
    </RiskShell>
  );
}
