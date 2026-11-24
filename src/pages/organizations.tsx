import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  Chip,
  Dropdown,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
} from "@heroui/react";
import {
  Boxes,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Factory,
  HardHat,
  Hash,
  Info,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/ui";
import { useOrgTopTypes, useOrgTypeLabels, useOrgTypeOptions } from "@/lib/dict-store";
import { initialOrganizations } from "@/lib/mock-data";
import {
  CHILD_ORG_TYPES,
  ROOT_ORG_TYPES,
  orgStatusLabels,
  type Organization,
  type OrgStatus,
  type OrgType,
} from "@/lib/types";

type Meta = {
  icon: typeof Building2;
  chip: "accent" | "success" | "warning" | "default";
  tile: string;
  color: string;
};

const TYPE_META: Record<string, Meta> = {
  company: {
    icon: Building2,
    chip: "accent",
    tile: "bg-accent/12 text-accent",
    color: "var(--brand-purple)",
  },
  workshop: {
    icon: Factory,
    chip: "success",
    tile: "bg-success/12 text-[var(--brand-green-deep)]",
    color: "var(--brand-green-strong)",
  },
  section: {
    icon: Workflow,
    chip: "warning",
    tile: "bg-warning/12 text-warning",
    color: "var(--warning)",
  },
  department: {
    icon: UsersRound,
    chip: "default",
    tile: "bg-default/70 text-muted",
    color: "var(--muted)",
  },
  contractor: {
    icon: HardHat,
    chip: "default",
    tile: "bg-default/70 text-muted",
    color: "var(--muted)",
  },
};

/** 字典新增的组织类型（如 plant）没有专属 meta，用中性的兜底样式，避免 undefined 白屏 */
const META_FALLBACK: Meta = {
  icon: Boxes,
  chip: "accent",
  tile: "bg-accent/12 text-accent",
  color: "var(--brand-purple)",
};
const getMeta = (type: string): Meta => TYPE_META[type] ?? META_FALLBACK;

function InfoField({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  icon: typeof Building2;
  mono?: boolean;
}) {
  return (
    <div className="bg-default/40 border-separator/60 flex items-start gap-3 rounded-xl border p-3.5">
      <span className="text-muted bg-surface flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-muted text-xs">{label}</p>
        <p className={`text-foreground mt-1 truncate text-sm font-medium ${mono ? "font-mono" : ""}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function EditField({
  label,
  name,
  icon: Icon,
  defaultValue,
  placeholder,
  className = "",
}: {
  label: string;
  name: string;
  icon: typeof Building2;
  defaultValue: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <TextField name={name} defaultValue={defaultValue} className={`w-full ${className}`}>
      <Label>{label}</Label>
      <InputGroup>
        <InputGroup.Prefix>
          <Icon className="text-muted size-4" />
        </InputGroup.Prefix>
        <InputGroup.Input placeholder={placeholder} />
      </InputGroup>
    </TextField>
  );
}

export default function OrganizationsPage() {
  const orgTypeOptions = useOrgTypeOptions();
  const orgTypeLabels = useOrgTypeLabels();
  const orgTopTypes = useOrgTopTypes();
  const [orgs, setOrgs] = useState<Organization[]>(initialOrganizations);
  const [selectedId, setSelectedId] = useState(initialOrganizations[0].id);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(["O1000", "O1100", "O1200", "O1400"]),
  );
  const [query, setQuery] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [draftType, setDraftType] = useState<OrgType>(initialOrganizations[0].type);
  const [draftStatus, setDraftStatus] = useState<OrgStatus>(initialOrganizations[0].status);

  const [createParent, setCreateParent] = useState<Organization | null>(null);
  const [createIsRoot, setCreateIsRoot] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<OrgType>("company");

  const [renameTarget, setRenameTarget] = useState<Organization | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const byId = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);
  const selected = byId.get(selectedId) ?? orgs[0];
  const parent = selected.parentId ? byId.get(selected.parentId) : undefined;
  const meta = getMeta(selected.type);
  const SelectedIcon = meta.icon;

  const counts = useMemo(
    () => ({
      all: orgs.length,
      workshop: orgs.filter((o) => o.type === "workshop").length,
      section: orgs.filter((o) => o.type === "section").length,
      department: orgs.filter((o) => o.type === "department").length,
      contractor: orgs.filter((o) => o.type === "contractor").length,
    }),
    [orgs],
  );

  /** 搜索命中节点时保留其祖先，避免子树凭空消失 */
  const visibleIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const ids = new Set<string>();
    orgs.forEach((org) => {
      const hit = [org.name, org.code, org.leader].some((v) =>
        v.toLowerCase().includes(q),
      );
      if (!hit) return;
      let cur: Organization | undefined = org;
      while (cur) {
        ids.add(cur.id);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
    });
    return ids;
  }, [orgs, byId, query]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectOrg = (org: Organization) => {
    setSelectedId(org.id);
    setIsEditing(false);
  };

  const startEdit = () => {
    setDraftType(selected.type);
    setDraftStatus(selected.status);
    setIsEditing(true);
  };

  const saveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    setOrgs((prev) =>
      prev.map((o) =>
        o.id === selected.id
          ? {
              ...o,
              name,
              code: String(data.get("code") || "").trim(),
              type: draftType,
              leader: String(data.get("leader") || "").trim(),
              phone: String(data.get("phone") || "").trim(),
              address: String(data.get("address") || "").trim(),
              status: draftStatus,
              description: String(data.get("description") || "").trim(),
            }
          : o,
      ),
    );
    setIsEditing(false);
  };

  const openCreate = (parentOrg: Organization | null) => {
    const allowed = parentOrg ? CHILD_ORG_TYPES : ROOT_ORG_TYPES;
    const available = orgTypeOptions.filter((option) => allowed.includes(option.value));
    setCreateParent(parentOrg);
    setCreateIsRoot(!parentOrg);
    setCreateName("");
    setCreateType(available[0]?.value ?? allowed[0]);
    setCreateOpen(true);
  };

  const confirmCreate = () => {
    const name = createName.trim();
    if (!name) return;
    const parent = createParent;
    const siblingCount = orgs.filter((o) => o.parentId === (parent?.id ?? null)).length + 1;
    const newOrg: Organization = {
      id: `O${Date.now().toString().slice(-8)}`,
      parentId: parent?.id ?? null,
      name,
      type: createType,
      code: parent
        ? `${parent.code}-${String(siblingCount).padStart(2, "0")}`
        : `ORG-${String(siblingCount).padStart(2, "0")}`,
      leader: "",
      phone: "",
      address: "",
      status: "active",
      createdAt: new Date().toISOString().slice(0, 10),
      description: "",
    };
    setOrgs((prev) => [...prev, newOrg]);
    if (parent) setExpandedIds((prev) => new Set(prev).add(parent.id));
    selectOrg(newOrg);
    setCreateOpen(false);
  };

  const openRename = (org: Organization) => {
    setRenameTarget(org);
    setRenameValue(org.name);
    setRenameOpen(true);
  };

  const confirmRename = () => {
    const name = renameValue.trim();
    if (!name || !renameTarget) return;
    setOrgs((prev) => prev.map((o) => (o.id === renameTarget.id ? { ...o, name } : o)));
    setRenameOpen(false);
  };

  const collectSubtreeIds = (id: string): string[] => {
    const ids = [id];
    orgs.filter((o) => o.parentId === id).forEach((child) => ids.push(...collectSubtreeIds(child.id)));
    return ids;
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const removed = new Set(collectSubtreeIds(deleteTarget.id));
    const fallback = orgs.find((o) => !removed.has(o.id));
    setOrgs((prev) => prev.filter((o) => !removed.has(o.id)));
    setSelectedId(fallback?.id ?? "");
    setIsEditing(false);
    setDeleteOpen(false);
  };

  const renderTree = (parentId: string | null, depth: number): ReactNode =>
    orgs
      .filter((o) => o.parentId === parentId && (!visibleIds || visibleIds.has(o.id)))
      .map((org) => {
        const children = orgs.filter((o) => o.parentId === org.id);
        const shownChildren = children.filter((c) => !visibleIds || visibleIds.has(c.id));
        const expanded = expandedIds.has(org.id) || (!!query && shownChildren.length > 0);
        const itemMeta = getMeta(org.type);
        const Icon = itemMeta.icon;
        const isSelected = org.id === selected.id;
        const isRoot = org.parentId === null;

        return (
          <div key={org.id}>
            <div
              className={`group relative flex items-center gap-1 rounded-xl py-1.5 pr-1.5 transition-colors ${
                isSelected ? "bg-accent/10" : "hover:bg-default/50"
              }`}
              style={{ paddingLeft: `${6 + depth * 18}px` }}
            >
              {isSelected && (
                <span className="bg-accent absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-r-full shadow-[0_0_10px_var(--glow-purple)]" />
              )}
              {shownChildren.length > 0 ? (
                <button
                  type="button"
                  aria-label={expanded ? `收起 ${org.name}` : `展开 ${org.name}`}
                  onClick={() => toggleExpand(org.id)}
                  className="text-muted hover:text-foreground flex size-5 shrink-0 cursor-pointer items-center justify-center"
                >
                  {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}

              <button
                type="button"
                onClick={() => selectOrg(org)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${itemMeta.tile}`}
                >
                  <Icon className="size-4" />
                </span>
                <span
                  className={`truncate text-sm font-medium ${
                    isSelected ? "text-accent" : "text-foreground group-hover:text-accent"
                  }`}
                >
                  {org.name}
                </span>
                <Chip color={itemMeta.chip} size="sm" variant="soft" className="shrink-0">
                  {orgTypeLabels[org.type]}
                </Chip>
              </button>

              <div
                className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                }`}
              >
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={`在 ${org.name} 下新增`}
                  className="size-7 min-w-7"
                  onPress={() => openCreate(org)}
                >
                  <Plus className="text-muted size-3.5" />
                </Button>
                <Dropdown>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={`${org.name} 操作`}
                    className="size-7 min-w-7"
                  >
                    <MoreHorizontal className="text-muted size-3.5" />
                  </Button>
                  <Dropdown.Popover placement="bottom end">
                    <Dropdown.Menu aria-label={`${org.name} 操作`}>
                      <Dropdown.Item id="rename" textValue="编辑名称" onAction={() => openRename(org)}>
                        <Pencil className="size-4" /> 编辑名称
                      </Dropdown.Item>
                      {!isRoot && (
                        <Dropdown.Item
                          id="delete"
                          textValue="删除组织"
                          variant="danger"
                          onAction={() => {
                            setDeleteTarget(org);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" /> 删除组织
                        </Dropdown.Item>
                      )}
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            </div>
            {expanded && shownChildren.length > 0 && renderTree(org.id, depth + 1)}
          </div>
        );
      });

  return (
    <div>
      <PageHeader
        title="组织管理"
        description="维护公司、车间、部门与承包商的组织架构及基础信息。"
      />

      {/* 概览条 —— 与用户管理保持一致的紧凑统计样式；类型卡由「组织类别」字典的显示开关动态生成 */}
      <div
        className="mb-5 grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        {[
          { label: "组织总数", value: counts.all, code: "__all__" },
          ...orgTopTypes.map((t) => ({
            label: t.name,
            value: orgs.filter((o) => o.type === (t.code as OrgType)).length,
            code: t.code,
          })),
        ].map((s) => {
          const m = getMeta(s.code);
          const Icon = m.icon;
          return (
            <div className="neon-card flex items-center gap-3 rounded-xl px-4 py-3.5" key={s.code}>
              <span
                className="flex size-10 items-center justify-center rounded-lg"
                style={{
                  background: `color-mix(in oklch, ${m.color} 14%, transparent)`,
                  color: m.color,
                }}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-muted truncate text-xs">{s.label}</p>
                <p className="text-foreground text-xl font-bold leading-tight">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="org-workspace">
        {/* 左侧：组织树 */}
        <section className="neon-card org-panel rounded-2xl">
          <div className="border-separator flex shrink-0 items-center justify-between border-b px-4 py-4">
            <div className="flex items-center gap-2.5">
              <span className="bg-accent/12 text-accent flex size-9 items-center justify-center rounded-xl">
                <Building2 className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-foreground text-sm font-semibold">组织架构</h2>
                <p className="text-muted text-[11px]">共 {orgs.length} 个组织节点</p>
              </div>
            </div>
            <Dropdown>
              <Button size="sm" variant="primary" aria-label="新增组织">
                <Plus className="size-4" /> 新增 <ChevronDown className="size-3.5" />
              </Button>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu aria-label="新增组织">
                  <Dropdown.Item id="root" textValue="新增根级组织" onAction={() => openCreate(null)}>
                    <Building2 className="size-4" /> 新增根级组织
                  </Dropdown.Item>
                  <Dropdown.Item id="child" textValue="新增下级组织" onAction={() => openCreate(selected)}>
                    <Workflow className="size-4" /> 在「{selected.name}」下新增
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>

          <div className="border-separator/70 relative mx-4 mt-4 shrink-0">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              aria-label="搜索组织"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索组织名称、编码或负责人…"
              className="bg-default border-separator text-foreground placeholder:text-muted focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none transition-colors"
            />
          </div>

          <div className="table-scroll org-panel__body max-h-[60vh] px-2 py-3 lg:max-h-none">
            {renderTree(null, 0)}
            {(!visibleIds || visibleIds.size === 0) && query && (
              <p className="text-muted py-10 text-center text-sm">未找到匹配的组织</p>
            )}
          </div>

          <div className="border-separator text-muted flex shrink-0 items-center gap-2 border-t px-4 py-3 text-[11px]">
            <Info className="size-3.5" />
            悬停节点可新增下级、编辑名称或删除
          </div>
        </section>

        {/* 右侧：组织基本信息 */}
        <section className="neon-card org-panel rounded-2xl">
          <div className="border-separator flex shrink-0 flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3.5">
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 ${meta.tile}`}
              >
                <SelectedIcon className="size-6" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-foreground truncate text-lg font-semibold">{selected.name}</h2>
                  <Chip color={meta.chip} size="sm" variant="soft">
                    {orgTypeLabels[selected.type]}
                  </Chip>
                  <span className="text-muted inline-flex items-center gap-1.5 text-xs">
                    <span
                      className={`size-1.5 rounded-full ${
                        selected.status === "active" ? "bg-success dot-neon" : "bg-default-foreground/40"
                      }`}
                    />
                    {orgStatusLabels[selected.status]}
                  </span>
                </div>
                <p className="text-muted mt-1 truncate text-xs">
                  组织编码 {selected.code} · 上级组织 {parent?.name ?? "—"}
                </p>
              </div>
            </div>
            {!isEditing && (
              <Button variant="primary" size="sm" className="shrink-0" onPress={startEdit}>
                <Pencil className="size-4" /> 编辑
              </Button>
            )}
          </div>

          {!isEditing ? (
            <div className="table-scroll org-panel__body grid content-start gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              <InfoField label="组织名称" value={selected.name} icon={Building2} />
              <InfoField label="组织编码" value={selected.code} icon={Hash} mono />
              <InfoField label="组织类型" value={orgTypeLabels[selected.type]} icon={meta.icon} />
              <InfoField label="上级组织" value={parent?.name} icon={UsersRound} />
              <InfoField label="负责人" value={selected.leader} icon={UserRound} />
              <InfoField label="联系电话" value={selected.phone} icon={Phone} mono />
              <InfoField label="所在地址" value={selected.address} icon={MapPin} />
              <InfoField label="创建日期" value={selected.createdAt} icon={CalendarDays} mono />
              <InfoField label="组织状态" value={orgStatusLabels[selected.status]} icon={Check} />
              <div className="bg-default/40 border-separator/60 flex items-start gap-3 rounded-xl border p-3.5 sm:col-span-2 xl:col-span-3">
                <span className="text-muted bg-surface flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Info className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-muted text-xs">组织说明</p>
                  <p className="text-foreground mt-1 text-sm leading-relaxed">
                    {selected.description || "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={saveEdit} className="table-scroll org-panel__body p-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <EditField
                  label="组织名称"
                  name="name"
                  icon={Building2}
                  defaultValue={selected.name}
                  placeholder="请输入组织名称"
                />
                <EditField
                  label="组织编码"
                  name="code"
                  icon={Hash}
                  defaultValue={selected.code}
                  placeholder="例如：HY-CJ-01"
                />
                <div className="w-full space-y-1.5">
                  <Label>组织类型</Label>
                  <Select
                    className="w-full"
                    selectedKey={draftType}
                    onSelectionChange={(k) => setDraftType(String(k) as OrgType)}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox aria-label="选择组织类型">
                        {orgTypeOptions.map((option) => (
                          <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                            {option.label}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                <InfoField label="上级组织" value={parent?.name} icon={UsersRound} />
                <EditField
                  label="负责人"
                  name="leader"
                  icon={UserRound}
                  defaultValue={selected.leader}
                  placeholder="请输入负责人"
                />
                <EditField
                  label="联系电话"
                  name="phone"
                  icon={Phone}
                  defaultValue={selected.phone}
                  placeholder="请输入联系电话"
                />
                <EditField
                  label="所在地址"
                  name="address"
                  icon={MapPin}
                  defaultValue={selected.address}
                  placeholder="请输入所在地址"
                />
                <InfoField label="创建日期" value={selected.createdAt} icon={CalendarDays} mono />
                <div className="w-full space-y-1.5">
                  <Label>组织状态</Label>
                  <Select
                    className="w-full"
                    selectedKey={draftStatus}
                    onSelectionChange={(k) => setDraftStatus(String(k) as OrgStatus)}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox aria-label="选择组织状态">
                        {(Object.keys(orgStatusLabels) as OrgStatus[]).map((status) => (
                          <ListBox.Item key={status} id={status} textValue={orgStatusLabels[status]}>
                            {orgStatusLabels[status]}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                <div className="sm:col-span-2 xl:col-span-3">
                  <EditField
                    label="组织说明"
                    name="description"
                    icon={Info}
                    defaultValue={selected.description}
                    placeholder="请输入组织说明"
                  />
                </div>
              </div>
              <div className="border-separator mt-5 flex justify-end gap-2 border-t pt-4">
                <Button variant="tertiary" size="sm" onPress={() => setIsEditing(false)}>
                  <X className="size-4" /> 取消
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  <Check className="size-4" /> 保存修改
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* 新增下级组织 */}
      <Modal isOpen={createOpen} onOpenChange={setCreateOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{createIsRoot ? "新增根级组织" : "新增下级组织"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="space-y-4">
                  <p className="text-muted rounded-lg bg-accent/5 p-3 text-xs leading-relaxed">
                    {createIsRoot ? (
                      <>将在组织体系<span className="text-foreground font-semibold">顶层</span>新增根级节点，可选类别为公司或承包商。</>
                    ) : (
                      <>
                        将在 <span className="text-foreground font-semibold">{createParent?.name}</span> 下新增下级节点。
                      </>
                    )}
                    创建后可点击右侧「编辑」补全基础信息。
                  </p>
                  <TextField className="w-full" isRequired>
                    <Label>组织名称</Label>
                    <InputGroup>
                      <InputGroup.Input
                        autoFocus
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="例如：三号生产车间"
                      />
                    </InputGroup>
                  </TextField>
                  <div className="space-y-1.5">
                    <Label>组织类型</Label>
                    <Select
                      className="w-full"
                      selectedKey={createType}
                      onSelectionChange={(k) => setCreateType(String(k) as OrgType)}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox aria-label="选择新增组织类型">
                          {orgTypeOptions
                            .filter((option) =>
                              (createIsRoot ? ROOT_ORG_TYPES : CHILD_ORG_TYPES).includes(option.value),
                            )
                            .map((option) => (
                              <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                                {option.label}
                              </ListBox.Item>
                            ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setCreateOpen(false)}>取消</Button>
                <Button variant="primary" onPress={confirmCreate} isDisabled={!createName.trim()}>
                  创建组织
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* 编辑名称 */}
      <Modal isOpen={renameOpen} onOpenChange={setRenameOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[400px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>编辑组织名称</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField className="w-full" isRequired>
                  <Label>组织名称</Label>
                  <InputGroup>
                    <InputGroup.Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                    />
                  </InputGroup>
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setRenameOpen(false)}>取消</Button>
                <Button variant="primary" onPress={confirmRename} isDisabled={!renameValue.trim()}>
                  保存
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* 删除确认 */}
      <Modal isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>确认删除组织？</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-muted text-sm leading-relaxed">
                  即将删除 <span className="text-foreground font-semibold">{deleteTarget?.name}</span>
                  {collectSubtreeIds(deleteTarget?.id ?? "").length > 1
                    ? `及其下 ${collectSubtreeIds(deleteTarget?.id ?? "").length - 1} 个下级组织`
                    : ""}
                  。此操作无法撤销。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setDeleteOpen(false)}>取消</Button>
                <Button variant="danger" onPress={confirmDelete}>确认删除</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
