import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Building2, Download, MoreHorizontal, Pencil, Plus, QrCode, Search, Trash2 } from "lucide-react";
import { Button, Dropdown, Modal, Table } from "@heroui/react";

import { useAuth } from "@/provider";
import { useRiskData, riskId } from "@/lib/risk-store";
import { useInspectionMethods } from "@/lib/dict-store";
import { inspectionMethodLabels, type InspectionMethod, type RiskUnit } from "@/lib/risk-types";
import { RiskEmpty, RiskShell, StatCard } from "./risk-shared";
import { Field, FieldGrid, SelectField, TextAreaField } from "./risk-fields";

const blank = (tenantId: string, objectId: string): RiskUnit => ({
  id: "", tenantId, objectId, code: "", name: "", method: "qrcode", nfcCardNo: "",
  qrPayload: "", location: "", cycleDays: 7, status: "active", description: "",
  createdAt: "", updatedAt: "",
});

/** 可打印二维码标签：白色卡片 + 二维码 + 单元信息，支持下载 PNG */
function QrLabel({
  unit,
  objectName,
  onClose,
}: {
  unit: RiskUnit;
  objectName: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    const payload = unit.qrPayload || `${location.origin}/subsystems/risk/units/${unit.id}`;
    QRCode.toDataURL(payload, { width: 320, margin: 2, color: { dark: "#241B33", light: "#FFFFFF" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [unit]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `风险单元-${unit.code || unit.name}.png`;
    a.click();
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-sm">
        <Modal.Header><Modal.Heading>二维码标签 · {unit.name}</Modal.Heading></Modal.Header>
        <Modal.Body>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-gray-900">
            {dataUrl ? <img src={dataUrl} alt="单元二维码" className="size-48" /> : <div className="size-48 animate-pulse rounded bg-gray-100" />}
            <div className="text-center">
              <p className="text-base font-semibold">{unit.name}</p>
              <p className="text-xs text-gray-500">{objectName} · {unit.code}</p>
              <p className="mt-1 text-[11px] text-gray-400">扫码查看并执行隐患排查任务</p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="tertiary" onPress={onClose}>关闭</Button>
          <Button variant="primary" onPress={download} isDisabled={!dataUrl}><Download className="size-4" /> 下载标签</Button>
        </Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
  );
}

export default function RiskUnitsPage() {
  const { user } = useAuth();
  const tenantId = user?.workspaceId ?? null;
  const { db, mutate } = useRiskData(tenantId);
  const methods = useInspectionMethods();
  const objectMap = useMemo(() => Object.fromEntries(db.objects.map((o) => [o.id, o.name])), [db.objects]);

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RiskUnit | null>(null);
  const [form, setForm] = useState<RiskUnit>(blank(tenantId ?? "", ""));
  const [deleting, setDeleting] = useState<RiskUnit | null>(null);
  const [qrUnit, setQrUnit] = useState<RiskUnit | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.units.filter((u) =>
      !q || [u.name, u.code, objectMap[u.objectId], u.nfcCardNo].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [db.units, query, objectMap]);

  const setField = <K extends keyof RiskUnit>(key: K, value: RiskUnit[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank(tenantId ?? "", db.objects[0]?.id ?? ""), code: `DY-${Date.now().toString().slice(-6)}` });
    setDialogOpen(true);
  };
  const openEdit = (unit: RiskUnit) => { setEditing(unit); setForm({ ...unit }); setDialogOpen(true); };
  const save = async () => {
    if (!tenantId || !form.name.trim() || !form.objectId) return;
    const now = new Date().toISOString().slice(0, 10);
    const id = editing?.id ?? riskId("RU");
    const record: RiskUnit = {
      ...form, id, tenantId,
      qrPayload: form.method === "qrcode" ? `${window.location.origin}/subsystems/risk/units/${id}` : "",
      nfcCardNo: form.method === "nfc" ? form.nfcCardNo : "",
      createdAt: editing?.createdAt ?? now, updatedAt: now,
    };
    await mutate((current) => ({
      ...current,
      units: editing ? current.units.map((u) => (u.id === editing.id ? record : u)) : [...current.units, record],
    }));
    setDialogOpen(false);
  };
  const remove = async () => {
    if (!deleting) return;
    const eventIds = new Set(db.events.filter((e) => e.unitId === deleting.id).map((e) => e.id));
    await mutate((current) => ({
      ...current,
      units: current.units.filter((u) => u.id !== deleting.id),
      events: current.events.filter((e) => !eventIds.has(e.id)),
      evaluations: current.evaluations.filter((ev) => !eventIds.has(ev.eventId)),
      measures: current.measures.filter((m) => !eventIds.has(m.eventId)),
    }));
    setDeleting(null);
  };

  return (
    <RiskShell title="风险分析单元" description="将分析对象拆解为隐患排查单元，配置二维码 / NFC / 人员定位排查方式。"
      actions={<div className="mb-5 flex justify-end"><Button variant="primary" onPress={openCreate}><Plus className="size-4" /> 新增单元</Button></div>}>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="单元总数" value={db.units.length} accent="purple" />
        <StatCard label="二维码标签" value={db.units.filter((u) => u.method === "qrcode").length} accent="green" />
        <StatCard label="NFC 绑定" value={db.units.filter((u) => u.method === "nfc").length} accent="blue" />
      </div>

      <div className="neon-card rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <label className="border-separator bg-field-background focus-within:border-accent flex max-w-xs items-center gap-2 rounded-xl border px-3 py-2 transition-colors">
            <Search className="text-muted size-4 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索单元名称 / 编码 / NFC 卡号"
              className="text-foreground placeholder:text-muted w-full bg-transparent text-sm outline-none" />
          </label>
        </div>

        {filtered.length === 0 ? <RiskEmpty text="暂无风险分析单元，先添加对象后再拆解单元。" /> : (
          <Table aria-label="风险分析单元列表" variant="secondary">
            <Table.Header>
              <Table.Column>单元名称</Table.Column>
              <Table.Column>所属对象</Table.Column>
              <Table.Column>编码</Table.Column>
              <Table.Column>排查方式</Table.Column>
              <Table.Column>周期</Table.Column>
              <Table.Column>状态</Table.Column>
              <Table.Column><span className="sr-only">操作</span></Table.Column>
            </Table.Header>
            <Table.Body>
              {filtered.map((unit) => (
                <Table.Row key={unit.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <span className="bg-accent/12 text-accent flex size-8 items-center justify-center rounded-lg"><Building2 className="size-4" /></span>
                      <div>
                        <p className="text-foreground text-sm font-medium">{unit.name}</p>
                        {unit.location && <p className="text-muted text-[11px]">{unit.location}</p>}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-muted text-xs">{objectMap[unit.objectId] ?? "—"}</Table.Cell>
                  <Table.Cell className="text-muted text-xs">{unit.code}</Table.Cell>
                  <Table.Cell>
                    <span className="border-separator text-muted inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
                      {inspectionMethodLabels[unit.method]}
                      {unit.method === "nfc" && unit.nfcCardNo && <span className="text-accent">· {unit.nfcCardNo}</span>}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="text-muted text-xs">{unit.cycleDays} 天</Table.Cell>
                  <Table.Cell>
                    <span className={`text-xs ${unit.status === "active" ? "text-success" : "text-muted"}`}>
                      {unit.status === "active" ? "启用" : "停用"}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      {unit.method === "qrcode" && (
                        <Button isIconOnly size="sm" variant="ghost" aria-label={`查看二维码 ${unit.name}`} onPress={() => setQrUnit(unit)}>
                          <QrCode className="size-4" />
                        </Button>
                      )}
                      <Dropdown>
                        <Dropdown.Trigger className="text-muted hover:text-accent rounded-lg p-1" aria-label={`操作 ${unit.name}`}>
                          <MoreHorizontal className="size-4" />
                        </Dropdown.Trigger>
                        <Dropdown.Popover placement="bottom end">
                          <Dropdown.Menu aria-label="单元操作">
                            <Dropdown.Item id="edit" textValue="编辑" onAction={() => openEdit(unit)}><Pencil className="size-4" /> 编辑</Dropdown.Item>
                            <Dropdown.Item id="delete" textValue="删除" variant="danger" onAction={() => setDeleting(unit)}><Trash2 className="size-4" /> 删除</Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      <Modal isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-2xl">
          <Modal.Header><Modal.Heading>{editing ? "编辑风险分析单元" : "新增风险分析单元"}</Modal.Heading></Modal.Header>
          <Modal.Body>
            <FieldGrid>
              <SelectField label="所属风险分析对象" value={form.objectId} onChange={(v) => setField("objectId", v)}
                options={db.objects.map((o) => ({ value: o.id, label: o.name }))} />
              <Field label="单元名称" value={form.name} onChange={(v) => setField("name", v)} placeholder="如：炉外喷吹" required />
              <Field label="单元编码" value={form.code} onChange={(v) => setField("code", v)} placeholder="如：1620102" />
              <SelectField label="排查方式" value={form.method} onChange={(v) => setField("method", v as InspectionMethod)} options={methods} />
              {form.method === "nfc" && (
                <Field label="NFC 卡编号" value={form.nfcCardNo} onChange={(v) => setField("nfcCardNo", v)} placeholder="绑定实体 NFC 卡编号" />
              )}
              {form.method === "qrcode" && (
                <div className="border-accent/20 bg-accent/5 rounded-xl border p-3 text-xs">
                  <p className="text-accent font-medium">保存后自动生成二维码标签</p>
                  <p className="text-muted mt-1">可在列表中点击二维码图标查看、下载并打印，张贴到对应位置。</p>
                </div>
              )}
              <Field label="所在位置" value={form.location} onChange={(v) => setField("location", v)} placeholder="如：高炉炉前平台" />
              <Field label="排查周期（天）" value={form.cycleDays} onChange={(v) => setField("cycleDays", Number(v) || 1)} type="number" />
              <SelectField label="状态" value={form.status} onChange={(v) => setField("status", v as RiskUnit["status"])}
                options={[{ value: "active", label: "启用" }, { value: "inactive", label: "停用" }]} />
              <div className="sm:col-span-2"><TextAreaField label="备注" value={form.description} onChange={(v) => setField("description", v)} /></div>
            </FieldGrid>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setDialogOpen(false)}>取消</Button>
            <Button variant="primary" onPress={save} isDisabled={!form.name.trim() || !form.objectId}>保存</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      <Modal isOpen={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-md">
          <Modal.Header><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
          <Modal.Body><p className="text-muted text-sm">确定删除「{deleting?.name}」吗？其下的风险事件、措施与评价记录将一并删除。</p></Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setDeleting(null)}>取消</Button>
            <Button variant="danger" onPress={remove}>确认删除</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      {qrUnit && <QrLabel unit={qrUnit} objectName={objectMap[qrUnit.objectId] ?? ""} onClose={() => setQrUnit(null)} />}
    </RiskShell>
  );
}
