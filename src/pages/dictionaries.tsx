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
  ArrowDown,
  ArrowUp,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Info,
  Lock,
  Pencil,
  Pin,
  Plus,
  Power,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/ui";
import { dictActions, useDictionaries } from "@/lib/dict-store";
import {
  dictStatusLabels,
  type DictEntry,
  type DictGroup,
  type DictStatus,
} from "@/lib/types";

type EntryFormState = {
  mode: "create" | "edit";
  source?: DictEntry;
  parentId: string | null;
  code: string;
  name: string;
  description: string;
  level: number;
  sort: number;
  status: DictStatus;
};

type GroupFormState = {
  mode: "create" | "edit";
  source?: DictGroup;
  code: string;
  name: string;
  description: string;
  status: DictStatus;
};

const uid = (prefix: string) =>
  `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
const today = () => new Date().toISOString().slice(0, 10);

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Boxes;
  color: string;
}) {
  return (
    <div className="neon-card flex items-center gap-3 rounded-xl px-4 py-3.5">
      <span
        className="flex size-10 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in oklch, ${color} 14%, transparent)`,
          color,
        }}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-muted text-xs">{label}</p>
        <p className="text-foreground text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function DictionariesPage() {
  const { groups, entries } = useDictionaries();
  const [selectedGroupId, setSelectedGroupId] = useState("DG1000");
  const [groupQuery, setGroupQuery] = useState("");
  const [entryQuery, setEntryQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [groupForm, setGroupForm] = useState<GroupFormState | null>(null);
  const [entryForm, setEntryForm] = useState<EntryFormState | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<DictGroup | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<DictEntry | null>(null);
  const [formError, setFormError] = useState("");
  const [topNotice, setTopNotice] = useState("");

  const isShownInTop = (entry: DictEntry) => entry.showInTop ?? entry.code !== "company";
  const toggleShowInTop = (entry: DictEntry) => {
    if (isShownInTop(entry)) {
      dictActions.updateEntry(entry.id, { showInTop: false });
      setTopNotice(`已取消「${entry.name}」在组织顶部的显示`);
      return;
    }
    const shownCount = groupEntries.filter((e) => isShownInTop(e) && e.status === "enabled").length;
    if (shownCount >= 6) {
      setTopNotice("组织顶部最多显示 6 个类别，请先取消一个再开启");
      return;
    }
    dictActions.updateEntry(entry.id, { showInTop: true });
    setTopNotice(`「${entry.name}」已显示在组织管理页顶部`);
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

  const visibleGroups = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      [g.name, g.code, g.description].some((v) => v.toLowerCase().includes(q)),
    );
  }, [groups, groupQuery]);

  const groupEntries = useMemo(
    () => entries.filter((e) => e.groupId === selectedGroup?.id),
    [entries, selectedGroup],
  );

  const stats = useMemo(
    () => ({
      groups: groups.length,
      total: entries.length,
      enabled: entries.filter((e) => e.status === "enabled").length,
      disabled: entries.filter((e) => e.status === "disabled").length,
    }),
    [groups, entries],
  );

  /** 搜索命中时保留祖先链，避免多级节点凭空消失 */
  const visibleIds = useMemo(() => {
    const q = entryQuery.trim().toLowerCase();
    if (!q) return null;
    const byId = new Map(groupEntries.map((e) => [e.id, e]));
    const ids = new Set<string>();
    groupEntries.forEach((entry) => {
      const hit = [entry.name, entry.code, entry.description].some((v) =>
        v.toLowerCase().includes(q),
      );
      if (!hit) return;
      let current: DictEntry | undefined = entry;
      while (current) {
        ids.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    });
    return ids;
  }, [groupEntries, entryQuery]);

  const childrenOf = (parentId: string | null) =>
    groupEntries
      .filter((e) => e.parentId === parentId)
      .sort((a, b) => a.sort - b.sort);

  const descendantIds = (entryId: string): Set<string> => {
    const result = new Set<string>();
    const visit = (id: string) => {
      groupEntries
        .filter((e) => e.parentId === id)
        .forEach((child) => {
          result.add(child.id);
          visit(child.id);
        });
    };
    visit(entryId);
    return result;
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openGroupCreate = () => {
    setFormError("");
    setGroupForm({ mode: "create", code: "", name: "", description: "", status: "enabled" });
  };

  const openGroupEdit = (group: DictGroup) => {
    setFormError("");
    setGroupForm({
      mode: "edit",
      source: group,
      code: group.code,
      name: group.name,
      description: group.description,
      status: group.status,
    });
  };

  const confirmGroup = () => {
    if (!groupForm) return;
    const code = groupForm.code.trim();
    const name = groupForm.name.trim();
    if (!code || !name) {
      setFormError("字典编码与名称不能为空");
      return;
    }
    if (
      groups.some(
        (g) => g.code.toLowerCase() === code.toLowerCase() && g.id !== groupForm.source?.id,
      )
    ) {
      setFormError("字典编码已存在，请使用唯一编码");
      return;
    }
    if (groupForm.mode === "create") {
      const group: DictGroup = {
        id: uid("DG"),
        code,
        name,
        description: groupForm.description.trim(),
        status: groupForm.status,
        builtin: false,
        createdAt: today(),
      };
      dictActions.addGroup(group);
      setSelectedGroupId(group.id);
      setEntryQuery("");
    } else if (groupForm.source) {
      dictActions.updateGroup(groupForm.source.id, {
        code,
        name,
        description: groupForm.description.trim(),
        status: groupForm.status,
      });
    }
    setGroupForm(null);
  };

  const openEntryCreate = (parent: DictEntry | null) => {
    setFormError("");
    const level = parent ? parent.level + 1 : 1;
    const sort = childrenOf(parent?.id ?? null).length + 1;
    setEntryForm({
      mode: "create",
      parentId: parent?.id ?? null,
      code: "",
      name: "",
      description: "",
      level,
      sort,
      status: "enabled",
    });
  };

  const openEntryEdit = (entry: DictEntry) => {
    setFormError("");
    setEntryForm({
      mode: "edit",
      source: entry,
      parentId: entry.parentId,
      code: entry.code,
      name: entry.name,
      description: entry.description,
      level: entry.level,
      sort: entry.sort,
      status: entry.status,
    });
  };

  const confirmEntry = () => {
    if (!entryForm || !selectedGroup) return;
    const code = entryForm.code.trim();
    const name = entryForm.name.trim();
    if (!code || !name) {
      setFormError("字典编码与名称不能为空");
      return;
    }
    if (
      groupEntries.some(
        (e) => e.code.toLowerCase() === code.toLowerCase() && e.id !== entryForm.source?.id,
      )
    ) {
      setFormError("同一字典分类下编码不能重复");
      return;
    }
    if (entryForm.mode === "create") {
      dictActions.addEntry({
        id: uid("DE"),
        groupId: selectedGroup.id,
        parentId: entryForm.parentId,
        code,
        name,
        description: entryForm.description.trim(),
        level: entryForm.level,
        sort: entryForm.sort,
        status: entryForm.status,
        builtin: false,
        createdAt: today(),
      });
      if (entryForm.parentId) {
        setExpandedIds((prev) => new Set(prev).add(entryForm.parentId as string));
      }
    } else if (entryForm.source) {
      // 层级由上级字典派生，改上级时 level 已在表单里同步；这里必须连 parentId 一起提交，
      // 否则节点不会真正移动到新上级下方（树位置由 parentId 决定，level 只是展示数字）。
      // 换上级时 sort 放到新父节点末尾，避免与现有兄弟的 sort 重复导致顺序错乱。
      const parentChanged = entryForm.parentId !== entryForm.source.parentId;
      const nextSort = parentChanged
        ? childrenOf(entryForm.parentId).length + 1
        : entryForm.sort;
      dictActions.updateEntry(entryForm.source.id, {
        parentId: entryForm.parentId,
        code,
        name,
        description: entryForm.description.trim(),
        level: entryForm.level,
        sort: nextSort,
        status: entryForm.status,
      });
      // 移动后自动展开新上级，避免节点"消失"造成没生效的错觉
      if (entryForm.parentId) {
        setExpandedIds((prev) => new Set(prev).add(entryForm.parentId as string));
      }
    }
    setEntryForm(null);
  };

  const moveEntry = (entry: DictEntry, direction: -1 | 1) => {
    const siblings = childrenOf(entry.parentId);
    const index = siblings.findIndex((e) => e.id === entry.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    // 用数组顺序整体重排，sort 规范化为 1..n；比交换 sort 值更稳，重复值也能正确移动
    const ids = siblings.map((e) => e.id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    dictActions.reorderSiblings(entry.groupId, entry.parentId, ids);
  };

  const renderEntryTree = (parentId: string | null, depth: number): ReactNode =>
    childrenOf(parentId)
      .filter((entry) => !visibleIds || visibleIds.has(entry.id))
      .map((entry) => {
        const children = childrenOf(entry.id).filter(
          (child) => !visibleIds || visibleIds.has(child.id),
        );
        const expanded = expandedIds.has(entry.id) || (!!entryQuery && children.length > 0);
        const disabled = entry.status === "disabled";

        return (
          <div key={entry.id}>
            <div
              className={`group flex items-center gap-2 rounded-xl py-2 pr-2 transition-colors hover:bg-default/50 ${
                depth === 0 ? "mt-1" : ""
              }`}
              style={{ paddingLeft: `${8 + depth * 24}px` }}
            >
              {children.length > 0 ? (
                <button
                  type="button"
                  aria-label={expanded ? `收起 ${entry.name}` : `展开 ${entry.name}`}
                  onClick={() => toggleExpand(entry.id)}
                  className="text-muted hover:text-foreground flex size-5 shrink-0 cursor-pointer items-center justify-center"
                >
                  {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}

              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  disabled ? "bg-default/70 text-muted" : "bg-accent/12 text-accent"
                }`}
              >
                {entry.builtin ? <Lock className="size-4" /> : <Boxes className="size-4" />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`truncate text-sm font-medium ${disabled ? "text-muted" : "text-foreground"}`}
                  >
                    {entry.name}
                  </span>
                  <Chip size="sm" variant="soft" color="default" className="shrink-0 font-mono">
                    {entry.code}
                  </Chip>
                  {entry.level > 1 && (
                    <Chip size="sm" variant="soft" color="warning" className="shrink-0">
                      L{entry.level}
                    </Chip>
                  )}
                </div>
                {entry.description && (
                  <p className="text-muted mt-0.5 truncate text-[11px]">{entry.description}</p>
                )}
              </div>

              <Chip
                size="sm"
                variant="soft"
                color={disabled ? "default" : "success"}
                className="hidden shrink-0 sm:inline-flex"
              >
                {dictStatusLabels[entry.status]}
              </Chip>

              <div className="flex shrink-0 items-center gap-0.5">
                {selectedGroup?.code === "ORG_TYPE" && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={`${isShownInTop(entry) ? "取消" : "设置"} ${entry.name} 显示在组织顶部`}
                    className={`size-7 min-w-7 ${isShownInTop(entry) ? "text-accent" : "text-muted"}`}
                    onPress={() => toggleShowInTop(entry)}
                  >
                    <Pin className="size-3.5" />
                  </Button>
                )}
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={`在 ${entry.name} 下新增子项`}
                  className="size-7 min-w-7"
                  onPress={() => openEntryCreate(entry)}
                >
                  <Plus className="text-muted size-3.5" />
                </Button>
                <Dropdown>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={`${entry.name} 操作`}
                    className="size-7 min-w-7"
                  >
                    <ChevronDown className="text-muted size-3.5" />
                  </Button>
                  <Dropdown.Popover placement="bottom end">
                    <Dropdown.Menu aria-label={`${entry.name} 操作`}>
                      <Dropdown.Item id="edit" textValue="编辑字典项" onAction={() => openEntryEdit(entry)}>
                        <Pencil className="size-4" /> 编辑字典项
                      </Dropdown.Item>
                      <Dropdown.Item id="up" textValue="上移" onAction={() => moveEntry(entry, -1)}>
                        <ArrowUp className="size-4" /> 上移
                      </Dropdown.Item>
                      <Dropdown.Item id="down" textValue="下移" onAction={() => moveEntry(entry, 1)}>
                        <ArrowDown className="size-4" /> 下移
                      </Dropdown.Item>
                      <Dropdown.Item
                        id="toggle"
                        textValue={disabled ? "启用" : "停用"}
                        onAction={() =>
                          dictActions.updateEntry(entry.id, {
                            status: disabled ? "enabled" : "disabled",
                          })
                        }
                      >
                        <Power className="size-4" /> {disabled ? "启用" : "停用"}
                      </Dropdown.Item>
                      {!entry.builtin && (
                        <Dropdown.Item
                          id="delete"
                          textValue="删除字典项"
                          variant="danger"
                          onAction={() => setDeleteEntryTarget(entry)}
                        >
                          <Trash2 className="size-4" /> 删除字典项
                        </Dropdown.Item>
                      )}
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            </div>
            {expanded && children.length > 0 && renderEntryTree(entry.id, depth + 1)}
          </div>
        );
      });

  return (
    <div>
      <PageHeader
        title="数据字典"
        description="统一维护平台业务字典项，支持分类、多级层级、编码与启停管理。"
        actions={
          <>
            <Button size="sm" variant="outline" onPress={() => dictActions.reset()}>
              <RotateCcw className="size-4" /> 恢复默认
            </Button>
            <Button size="sm" variant="primary" onPress={openGroupCreate}>
              <Plus className="size-4" /> 新增分类
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="字典分类" value={stats.groups} icon={Database} color="var(--brand-purple)" />
        <SummaryCard label="字典项总数" value={stats.total} icon={Boxes} color="var(--brand-green-strong)" />
        <SummaryCard label="已启用" value={stats.enabled} icon={Check} color="var(--brand-green-strong)" />
        <SummaryCard label="已停用" value={stats.disabled} icon={Power} color="var(--muted)" />
      </div>

      <div className="dict-workspace">
        {/* 左：字典分类 */}
        <section className="neon-card dict-panel rounded-2xl">
          <div className="border-separator flex shrink-0 items-center justify-between border-b px-4 py-4">
            <div className="flex items-center gap-2.5">
              <span className="bg-accent/12 text-accent flex size-9 items-center justify-center rounded-xl">
                <Database className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-foreground text-sm font-semibold">字典分类</h2>
                <p className="text-muted text-[11px]">共 {groups.length} 个分类</p>
              </div>
            </div>
          </div>

          <div className="border-separator/70 relative mx-4 mt-4 shrink-0">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              aria-label="搜索字典分类"
              value={groupQuery}
              onChange={(e) => setGroupQuery(e.target.value)}
              placeholder="搜索分类名称或编码…"
              className="bg-default border-separator text-foreground placeholder:text-muted focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none transition-colors"
            />
          </div>

          <div className="dict-panel__body px-2 py-3">
            {visibleGroups.map((group) => {
              const isSelected = group.id === selectedGroup?.id;
              const count = entries.filter((e) => e.groupId === group.id).length;
              return (
                <div
                  key={group.id}
                  className={`group relative mb-1 flex items-center gap-2 rounded-xl py-2.5 pr-2 pl-3 transition-colors ${
                    isSelected ? "bg-accent/10" : "hover:bg-default/50"
                  }`}
                >
                  {isSelected && (
                    <span className="bg-accent absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-r-full shadow-[0_0_10px_var(--glow-purple)]" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setEntryQuery("");
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? "bg-accent/15 text-accent" : "bg-default/70 text-muted"
                      }`}
                    >
                      {group.builtin ? <Lock className="size-4" /> : <Database className="size-4" />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-sm font-medium ${
                          isSelected ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {group.name}
                      </span>
                      <span className="text-muted block truncate font-mono text-[10px]">
                        {group.code} · {count} 项
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`编辑分类 ${group.name}`}
                      className="size-7 min-w-7"
                      onPress={() => openGroupEdit(group)}
                    >
                      <Pencil className="text-muted size-3.5" />
                    </Button>
                    {!group.builtin && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label={`删除分类 ${group.name}`}
                        className="size-7 min-w-7"
                        onPress={() => setDeleteGroupTarget(group)}
                      >
                        <Trash2 className="text-muted size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {visibleGroups.length === 0 && (
              <p className="text-muted py-10 text-center text-sm">未找到匹配的字典分类</p>
            )}
          </div>

          <div className="border-separator text-muted flex shrink-0 items-center gap-2 border-t px-4 py-3 text-[11px]">
            <Info className="size-3.5" />
            内置分类不可删除，避免影响已有业务数据
          </div>
        </section>

        {/* 右：字典项（多级） */}
        <section className="neon-card dict-panel rounded-2xl">
          <div className="border-separator flex shrink-0 flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="bg-success/12 text-[var(--brand-green-deep)] flex size-10 items-center justify-center rounded-xl">
                <Boxes className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-foreground truncate text-base font-semibold">
                    {selectedGroup?.name ?? "未选择分类"}
                  </h2>
                  <Chip size="sm" variant="soft" color={selectedGroup?.status === "enabled" ? "success" : "default"}>
                    {selectedGroup ? dictStatusLabels[selectedGroup.status] : "—"}
                  </Chip>
                </div>
                <p className="text-muted mt-0.5 truncate text-xs">
                  {selectedGroup?.description || "—"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="shrink-0"
              isDisabled={!selectedGroup}
              onPress={() => openEntryCreate(null)}
            >
              <Plus className="size-4" /> 新增字典项
            </Button>
          </div>

          <div className="border-separator/70 relative mx-5 mt-4 shrink-0">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              aria-label="搜索字典项"
              value={entryQuery}
              onChange={(e) => setEntryQuery(e.target.value)}
              placeholder="搜索字典项名称、编码或描述…"
              className="bg-default border-separator text-foreground placeholder:text-muted focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none transition-colors"
            />
          </div>

          {topNotice && (
            <div className="bg-accent/10 text-accent mx-5 mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs">
              <span>{topNotice}</span>
              <button type="button" aria-label="关闭提示" className="cursor-pointer" onClick={() => setTopNotice("")}>
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="dict-panel__body px-3 py-2">
            {renderEntryTree(null, 0)}
            {groupEntries.length === 0 && (
              <div className="text-muted flex flex-col items-center gap-2 py-16 text-sm">
                <Boxes className="size-8 opacity-50" />
                该分类下暂无字典项，点击右上角「新增字典项」开始配置
              </div>
            )}
            {groupEntries.length > 0 && visibleIds?.size === 0 && (
              <p className="text-muted py-10 text-center text-sm">未找到匹配的字典项</p>
            )}
          </div>

          <div className="border-separator text-muted flex shrink-0 items-center gap-2 border-t px-5 py-3 text-[11px]">
            <Info className="size-3.5" />
            支持无限层级；「组织类别」分类的启停与排序会实时影响组织新增的可选类型
          </div>
        </section>
      </div>

      {/* 新增 / 编辑字典分类 */}
      <Modal isOpen={!!groupForm} onOpenChange={(open) => !open && setGroupForm(null)}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{groupForm?.mode === "edit" ? "编辑字典分类" : "新增字典分类"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField className="w-full" isRequired isDisabled={groupForm?.source?.builtin}>
                      <Label>分类编码</Label>
                      <InputGroup>
                        <InputGroup.Input
                          value={groupForm?.code ?? ""}
                          onChange={(e) =>
                            setGroupForm((prev) => prev && { ...prev, code: e.target.value })
                          }
                          placeholder="例如：CONTRACT_TYPE"
                        />
                      </InputGroup>
                    </TextField>
                    <Field label="状态">
                      <Select
                        className="w-full"
                        selectedKey={groupForm?.status ?? "enabled"}
                        onSelectionChange={(key) =>
                          setGroupForm((prev) => prev && { ...prev, status: String(key) as DictStatus })
                        }
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox aria-label="选择分类状态">
                            {(Object.keys(dictStatusLabels) as DictStatus[]).map((status) => (
                              <ListBox.Item key={status} id={status} textValue={dictStatusLabels[status]}>
                                {dictStatusLabels[status]}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </Field>
                  </div>
                  <Field label="分类名称">
                    <TextField className="w-full" isRequired>
                      <InputGroup>
                        <InputGroup.Input
                          value={groupForm?.name ?? ""}
                          onChange={(e) =>
                            setGroupForm((prev) => prev && { ...prev, name: e.target.value })
                          }
                          placeholder="例如：合同类型"
                        />
                      </InputGroup>
                    </TextField>
                  </Field>
                  <Field label="分类描述">
                    <textarea
                      rows={3}
                      value={groupForm?.description ?? ""}
                      onChange={(e) =>
                        setGroupForm((prev) => prev && { ...prev, description: e.target.value })
                      }
                      placeholder="说明该字典分类的业务用途…"
                      className="bg-default border-separator text-foreground placeholder:text-muted focus:border-accent w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                  {formError && <p className="text-danger text-xs">{formError}</p>}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setGroupForm(null)}>取消</Button>
                <Button variant="primary" onPress={confirmGroup}>保存</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* 新增 / 编辑字典项 */}
      <Modal isOpen={!!entryForm} onOpenChange={(open) => !open && setEntryForm(null)}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[520px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{entryForm?.mode === "edit" ? "编辑字典项" : "新增字典项"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="字典编码">
                      <TextField className="w-full" isRequired isDisabled={entryForm?.source?.builtin}>
                        <InputGroup>
                          <InputGroup.Input
                            value={entryForm?.code ?? ""}
                            onChange={(e) =>
                              setEntryForm((prev) => prev && { ...prev, code: e.target.value })
                            }
                            placeholder="例如：SAFETY_OFFICER"
                          />
                        </InputGroup>
                      </TextField>
                    </Field>
                    <Field label="字典名称">
                      <TextField className="w-full" isRequired>
                        <InputGroup>
                          <InputGroup.Input
                            value={entryForm?.name ?? ""}
                            onChange={(e) =>
                              setEntryForm((prev) => prev && { ...prev, name: e.target.value })
                            }
                            placeholder="例如：安全员"
                          />
                        </InputGroup>
                      </TextField>
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="层级（随上级自动）">
                      <TextField className="w-full" isDisabled>
                        <InputGroup>
                          <InputGroup.Input value={`第 ${entryForm?.level ?? 1} 层`} readOnly />
                        </InputGroup>
                      </TextField>
                    </Field>
                    <Field label="排序">
                      <TextField className="w-full" type="number">
                        <InputGroup>
                          <InputGroup.Input
                            value={String(entryForm?.sort ?? 1)}
                            onChange={(e) =>
                              setEntryForm((prev) =>
                                prev && { ...prev, sort: Math.max(1, Number(e.target.value) || 1) },
                              )
                            }
                          />
                        </InputGroup>
                      </TextField>
                    </Field>
                    <Field label="状态">
                      <Select
                        className="w-full"
                        selectedKey={entryForm?.status ?? "enabled"}
                        onSelectionChange={(key) =>
                          setEntryForm((prev) => prev && { ...prev, status: String(key) as DictStatus })
                        }
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox aria-label="选择字典项状态">
                            {(Object.keys(dictStatusLabels) as DictStatus[]).map((status) => (
                              <ListBox.Item key={status} id={status} textValue={dictStatusLabels[status]}>
                                {dictStatusLabels[status]}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </Field>
                  </div>
                  <Field label="上级字典项">
                    <Select
                      className="w-full"
                      selectedKey={entryForm?.parentId ?? "__root__"}
                      onSelectionChange={(key) => {
                        const parentId = String(key) === "__root__" ? null : String(key);
                        const parent = parentId ? groupEntries.find((e) => e.id === parentId) : undefined;
                        setEntryForm((prev) =>
                          prev && { ...prev, parentId, level: (parent?.level ?? 0) + 1 },
                        );
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox aria-label="选择上级字典项">
                          <ListBox.Item key="__root__" id="__root__" textValue="顶级字典项">
                            顶级字典项
                          </ListBox.Item>
                          {groupEntries
                            .filter(
                              (e) =>
                                e.id !== entryForm?.source?.id &&
                                !descendantIds(entryForm?.source?.id ?? "").has(e.id),
                            )
                            .sort((a, b) => a.level - b.level || a.sort - b.sort)
                            .map((e) => (
                              <ListBox.Item
                                key={e.id}
                                id={e.id}
                                textValue={`${"　".repeat(e.level - 1)}${e.name}`}
                              >
                                {"　".repeat(e.level - 1)}
                                {e.name} · {e.code}
                              </ListBox.Item>
                            ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </Field>
                  <Field label="字典描述">
                    <textarea
                      rows={3}
                      value={entryForm?.description ?? ""}
                      onChange={(e) =>
                        setEntryForm((prev) => prev && { ...prev, description: e.target.value })
                      }
                      placeholder="说明该字典项的含义或使用场景…"
                      className="bg-default border-separator text-foreground placeholder:text-muted focus:border-accent w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                  {formError && <p className="text-danger text-xs">{formError}</p>}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setEntryForm(null)}>取消</Button>
                <Button variant="primary" onPress={confirmEntry}>保存</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* 删除分类确认 */}
      <Modal isOpen={!!deleteGroupTarget} onOpenChange={(open) => !open && setDeleteGroupTarget(null)}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>确认删除字典分类？</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-muted text-sm leading-relaxed">
                  即将删除 <span className="text-foreground font-semibold">{deleteGroupTarget?.name}</span>
                  ，该分类下的 {entries.filter((e) => e.groupId === deleteGroupTarget?.id).length}{" "}
                  个字典项及全部子层级将一并删除。此操作无法撤销。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setDeleteGroupTarget(null)}>取消</Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (deleteGroupTarget) dictActions.deleteGroup(deleteGroupTarget.id);
                    setDeleteGroupTarget(null);
                  }}
                >
                  确认删除
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* 删除字典项确认 */}
      <Modal isOpen={!!deleteEntryTarget} onOpenChange={(open) => !open && setDeleteEntryTarget(null)}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>确认删除字典项？</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-muted text-sm leading-relaxed">
                  即将删除 <span className="text-foreground font-semibold">{deleteEntryTarget?.name}</span>
                  {deleteEntryTarget && descendantIds(deleteEntryTarget.id).size > 0
                    ? `及其下 ${descendantIds(deleteEntryTarget.id).size} 个子字典项`
                    : ""}
                  。此操作无法撤销。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setDeleteEntryTarget(null)}>取消</Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (deleteEntryTarget) dictActions.deleteEntry(deleteEntryTarget.id);
                    setDeleteEntryTarget(null);
                  }}
                >
                  确认删除
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
