import { useMemo, useState } from "react";
import { Building2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button, Dropdown, Modal, Table } from "@heroui/react";

import { useAuth } from "@/provider";
import { useRiskData, riskId } from "@/lib/risk-store";
import { useHazardLevels, useRiskObjectTypes } from "@/lib/dict-store";
import { hazardLevelLabels, type HazardLevel, type RiskObject } from "@/lib/risk-types";
import { RiskEmpty, RiskQuickNav, RiskShell, StatCard } from "./risk-shared";
import { Field, FieldGrid, SelectField, TextAreaField } from "./risk-fields";

const blank = (tenantId: string): RiskObject => ({
  id: "", tenantId, code: "", name: "", typeCode: "", departmentId: "", departmentName: "",
  responsibleId: "", responsibleName: "", hazardLevel: "none", location: "", phone: "",
  status: "active", description: "", createdAt: "", updatedAt: "",
});

export default function RiskObjectsPage() {
  const { user } = useAuth();
  const tenantId = user?.workspaceId ?? null;
  const { db, mutate } = useRiskData(tenantId);
  const objectTypes = useRiskObjectTypes();
  const hazardOptions = useHazardLevels();
  const typeLabels = useMemo(() => Object.fromEntries(objectTypes.map((o) => [o.value, o.label])), [objectTypes]);

  const [query, setQuery] = useState("");
  const [hazardFilter, setHazardFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RiskObject | null>(null);
  const [form, setForm] = useState<RiskObject>(blank(tenantId ?? ""));
  const [deleting, setDeleting] = useState<RiskObject | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.objects.filter((o) =>
      (!q || [o.name, o.code, o.departmentName, o.responsibleName].some((v) => v.toLowerCase().includes(q))) &&
      (hazardFilter === "all" || o.hazardLevel === hazardFilter),
    );
  }, [db.objects, query, hazardFilter]);

  const hazardCount = db.objects.filter((o) => o.hazardLevel !== "none").length;
  const setField = <K extends keyof RiskObject>(key: K, value: RiskObject[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank(tenantId ?? ""), code: `FX-${Date.now().toString().slice(-6)}` });
    setDialogOpen(true);
  };
  const openEdit = (obj: RiskObject) => { setEditing(obj); setForm({ ...obj }); setDialogOpen(true); };
  const save = async () => {
    if (!tenantId || !form.name.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    const record: RiskObject = {
      ...form, id: editing?.id ?? riskId("RO"), tenantId,
      createdAt: editing?.createdAt ?? now, updatedAt: now,
    };
    await mutate((current) => ({
      ...current,
      objects: editing ? current.objects.map((o) => (o.id === editing.id ? record : o)) : [...current.objects, record],
    }));
    setDialogOpen(false);
  };
  const remove = async () => {
    if (!deleting) return;
    const objectId = deleting.id;
    const unitIds = new Set(db.units.filter((u) => u.objectId === objectId).map((u) => u.id));
    const eventIds = new Set(db.events.filter((e) => unitIds.has(e.unitId)).map((e) => e.id));
    await mutate((current) => ({
      objects: current.objects.filter((o) => o.id !== objectId),
      units: current.units.filter((u) => u.objectId !== objectId),
      events: current.events.filter((e) => !eventIds.has(e.id)),
      evaluations: current.evaluations.filter((ev) => !eventIds.has(ev.eventId)),
      measures: current.measures.filter((m) => !eventIds.has(m.eventId)),
    }));
    setDeleting(null);
  };

  return (
    <RiskShell title="风险分析对象" description="录入企业风险管控对象：设备、设施、场所、区域，并设定负责人、部门与危险源等级。"
      actions={<div className="mb-5 flex justify-end"><Button variant="primary" onPress={openCreate}><Plus className="size-4" /> 新增对象</Button></div>}>
      <RiskQuickNav />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="对象总数" value={db.objects.length} accent="purple" />
        <StatCard label="重大危险源" value={hazardCount} accent="red" />
        <StatCard label="启用中" value={db.objects.filter((o) => o.status === "active").length} accent="green" />
      </div>

      <div className="neon-card rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="border-separator bg-field-background focus-within:border-accent flex max-w-xs items-center gap-2 rounded-xl border px-3 py-2 transition-colors">
            <Search className="text-muted size-4 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称 / 编码 / 部门 / 责任人"
              className="text-foreground placeholder:text-muted w-full bg-transparent text-sm outline-none" />
          </label>
          <div className="border-separator text-muted flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
            危险源等级
            <select value={hazardFilter} onChange={(e) => setHazardFilter(e.target.value)}
              className="bg-transparent text-sm outline-none">
              <option value="all">全部</option>
              {hazardOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? <RiskEmpty text="暂无风险分析对象，点击「新增对象」开始录入。" /> : (
          <Table aria-label="风险分析对象列表" variant="secondary">
            <Table.Header>
              <Table.Column>对象名称</Table.Column>
              <Table.Column>编码</Table.Column>
              <Table.Column>类型</Table.Column>
              <Table.Column>责任部门 / 责任人</Table.Column>
              <Table.Column>危险源等级</Table.Column>
              <Table.Column>状态</Table.Column>
              <Table.Column><span className="sr-only">操作</span></Table.Column>
            </Table.Header>
            <Table.Body>
              {filtered.map((obj) => (
                <Table.Row key={obj.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <span className="bg-accent/12 text-accent flex size-8 items-center justify-center rounded-lg"><Building2 className="size-4" /></span>
                      <div>
                        <p className="text-foreground text-sm font-medium">{obj.name}</p>
                        {obj.location && <p className="text-muted text-[11px]">{obj.location}</p>}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-muted text-xs">{obj.code}</Table.Cell>
                  <Table.Cell className="text-muted text-xs">{typeLabels[obj.typeCode] ?? "—"}</Table.Cell>
                  <Table.Cell className="text-muted text-xs">{obj.departmentName || "—"} / {obj.responsibleName || "—"}</Table.Cell>
                  <Table.Cell className="text-xs">{hazardLevelLabels[obj.hazardLevel]}</Table.Cell>
                  <Table.Cell>
                    <span className={`inline-flex items-center gap-1.5 text-xs ${obj.status === "active" ? "text-success" : "text-muted"}`}>
                      <span className={`size-1.5 rounded-full ${obj.status === "active" ? "bg-success" : "bg-muted"}`} />
                      {obj.status === "active" ? "启用" : "停用"}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Dropdown>
                      <Dropdown.Trigger className="text-muted hover:text-accent rounded-lg p-1" aria-label={`操作 ${obj.name}`}>
                        <MoreHorizontal className="size-4" />
                      </Dropdown.Trigger>
                      <Dropdown.Popover placement="bottom end">
                        <Dropdown.Menu aria-label="对象操作">
                          <Dropdown.Item id="edit" textValue="编辑" onAction={() => openEdit(obj)}>
                            <Pencil className="size-4" /> 编辑
                          </Dropdown.Item>
                          <Dropdown.Item id="delete" textValue="删除" variant="danger" onAction={() => setDeleting(obj)}>
                            <Trash2 className="size-4" /> 删除
                          </Dropdown.Item>
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
          <Modal.Header><Modal.Heading>{editing ? "编辑风险分析对象" : "新增风险分析对象"}</Modal.Heading></Modal.Header>
          <Modal.Body>
            <FieldGrid>
              <Field label="对象名称" value={form.name} onChange={(v) => setField("name", v)} placeholder="如：1号生产高炉" required />
              <Field label="对象编码" value={form.code} onChange={(v) => setField("code", v)} placeholder="如：003002006008" />
              <SelectField label="对象类型" value={form.typeCode} onChange={(v) => setField("typeCode", v)} options={objectTypes} />
              <SelectField label="重大危险源等级" value={form.hazardLevel} onChange={(v) => setField("hazardLevel", v as HazardLevel)} options={hazardOptions} />
              <Field label="责任部门" value={form.departmentName} onChange={(v) => setField("departmentName", v)} placeholder="如：技术部" />
              <Field label="责任人" value={form.responsibleName} onChange={(v) => setField("responsibleName", v)} placeholder="如：王小健" />
              <Field label="所在位置" value={form.location} onChange={(v) => setField("location", v)} placeholder="如：一车间东区" />
              <Field label="联系电话" value={form.phone} onChange={(v) => setField("phone", v)} />
              <SelectField label="状态" value={form.status} onChange={(v) => setField("status", v as RiskObject["status"])}
                options={[{ value: "active", label: "启用" }, { value: "inactive", label: "停用" }]} />
              <div className="sm:col-span-2">
                <TextAreaField label="备注" value={form.description} onChange={(v) => setField("description", v)} placeholder="补充说明（选填）" />
              </div>
            </FieldGrid>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setDialogOpen(false)}>取消</Button>
            <Button variant="primary" onPress={save} isDisabled={!form.name.trim()}>保存</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      <Modal isOpen={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-md">
          <Modal.Header><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
          <Modal.Body>
            <p className="text-muted text-sm">
              确定删除「{deleting?.name}」吗？其下的分析单元、风险事件、管控措施与评价记录将一并删除，此操作不可恢复。
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setDeleting(null)}>取消</Button>
            <Button variant="danger" onPress={remove}>确认删除</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>
    </RiskShell>
  );
}
