import { useMemo, useState } from "react";
import { Filter, MoreHorizontal, Plus, Search, Trash2, UserCog, UserPlus, UsersRound } from "lucide-react";
import {
  Button,
  Dropdown,
  Input,
  Label,
  Modal,
  Pagination,
  Select,
  ListBox,
  Table,
  TextField,
} from "@heroui/react";

import { PageHeader, RoleChip, StatusChip, UserAvatar } from "@/components/ui";
import { tenantActions, useWorkspaceMembers } from "@/lib/tenant-store";
import { initialOrganizations } from "@/lib/mock-data";
import { type UserRole, type UserStatus, type WorkspaceRole } from "@/lib/types";
import { useAuth } from "@/provider";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/** 用户管理页的视图模型：由真实账号 + 成员关系派生 */
interface MemberView {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  departmentId: string | null;
  avatarColor: string;
  joinedAt: string;
  lastActive: string;
  workspaceRole: WorkspaceRole;
}

export default function UsersPage() {
  const { user } = useAuth();
  const members = useWorkspaceMembers(user?.workspaceId ?? null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [editing, setEditing] = useState<MemberView | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<MemberView | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 组织树节点（部门候选）：默认演示组织节点，真实工作空间的组织树后续接入后可替换这里
  const departmentNodes = useMemo(
    () => initialOrganizations.filter((o) => o.type !== "company").map((o) => ({ id: o.id, name: o.name })),
    [],
  );

  const users: MemberView[] = useMemo(
    () =>
      members.map(({ account, membership }) => ({
        id: membership.id,
        accountId: account.id,
        name: account.name,
        email: account.email || account.phone,
        role: membership.role === "member" ? "member" : "admin",
        status: membership.status === "active" ? "active" : "invited",
        department: membership.departmentId ? departmentNodes.find((d) => d.id === membership.departmentId)?.name ?? "未分组" : "未分组",
        departmentId: membership.departmentId,
        avatarColor: account.avatarColor,
        joinedAt: membership.joinedAt,
        lastActive: account.lastActive,
        workspaceRole: membership.role,
      })),
    [members, departmentNodes],
  );

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchQuery = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchQuery && matchRole && matchStatus;
    });
  }, [users, query, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeCount = users.filter((u) => u.status === "active").length;
  const invitedCount = users.filter((u) => u.status === "invited").length;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (u: MemberView) => {
    setEditing(u);
    setDialogOpen(true);
  };
  const confirmDelete = () => {
    if (deleting) tenantActions.removeMembership(deleting.id);
    setDeleteOpen(false);
    setDeleting(null);
  };

  const [formError, setFormError] = useState("");
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim();
    const workspaceRole = String(data.get("role") || "member") as WorkspaceRole;
    const departmentId = String(data.get("department") || "") || null;

    if (editing) {
      tenantActions.updateMembership(editing.id, {
        role: workspaceRole,
        departmentId,
        status: workspaceRole === "member" ? "active" : editing.status === "invited" ? "invited" : "active",
      });
    } else {
      const result = tenantActions.invite({
        workspaceId: user?.workspaceId ?? "",
        email,
        role: workspaceRole,
        invitedBy: user?.id ?? "",
      });
      if (result.error) {
        setFormError(result.error);
        return;
      }
    }
    setDialogOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="用户管理"
        description="管理当前组织的真实账号成员、角色与所在部门。"
        actions={
          <Button variant="primary" size="sm" onPress={openCreate}>
            <Plus className="size-4" /> 添加成员
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "全部用户", value: users.length, icon: UsersRound, color: "var(--brand-purple)" },
          { label: "活跃", value: activeCount, icon: UserCog, color: "var(--brand-green-strong)" },
          { label: "已邀请", value: invitedCount, icon: UserPlus, color: "#f59e0b" },
          { label: "已停用", value: users.length - activeCount - invitedCount, icon: Trash2, color: "var(--danger)" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div className="neon-card flex items-center gap-3 rounded-xl px-4 py-3.5" key={s.label}>
              <span className="flex size-10 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklch, ${s.color} 14%, transparent)`, color: s.color }}>
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-muted text-xs">{s.label}</p>
                <p className="text-foreground text-xl font-bold leading-tight">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="neon-card overflow-hidden rounded-2xl">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--separator)] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              aria-label="搜索用户"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="搜索姓名、邮箱或 ID…"
              className="bg-default border-separator text-foreground placeholder:text-muted focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-muted size-4" />
            <Select className="w-32" selectedKey={roleFilter} onSelectionChange={(k) => { setRoleFilter(String(k)); setPage(1); }}>
              <Label className="sr-only">角色筛选</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-label="按角色筛选">
                  <ListBox.Item id="all" textValue="全部角色">全部角色</ListBox.Item>
                  <ListBox.Item id="admin" textValue="管理员">管理员</ListBox.Item>
                  <ListBox.Item id="manager" textValue="经理">经理</ListBox.Item>
                  <ListBox.Item id="member" textValue="成员">成员</ListBox.Item>
                  <ListBox.Item id="viewer" textValue="访客">访客</ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            <Select className="w-32" selectedKey={statusFilter} onSelectionChange={(k) => { setStatusFilter(String(k)); setPage(1); }}>
              <Label className="sr-only">状态筛选</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-label="按状态筛选">
                  <ListBox.Item id="all" textValue="全部状态">全部状态</ListBox.Item>
                  <ListBox.Item id="active" textValue="活跃">活跃</ListBox.Item>
                  <ListBox.Item id="invited" textValue="已邀请">已邀请</ListBox.Item>
                  <ListBox.Item id="suspended" textValue="已停用">已停用</ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>

        {/* Table — fixed viewport, scrolls inside the list only (page stays put) */}
        <Table variant="secondary">
          <Table.ScrollContainer className="table-scroll max-h-[clamp(360px,56vh,640px)] overflow-y-auto">
            <Table.Content aria-label="用户列表" className="min-w-[720px]">
              <Table.Header className="bg-[var(--surface-secondary)] sticky top-0 z-10">
                <Table.Column isRowHeader>用户</Table.Column>
                <Table.Column>角色</Table.Column>
                <Table.Column>部门</Table.Column>
                <Table.Column>状态</Table.Column>
                <Table.Column>加入时间</Table.Column>
                <Table.Column>最近活跃</Table.Column>
                <Table.Column aria-label="操作" />
              </Table.Header>
              <Table.Body>
                {paged.map((u) => (
                  <Table.Row key={u.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} color={u.avatarColor} />
                        <div>
                          <p className="text-foreground text-sm font-medium">{u.name}</p>
                          <p className="text-muted text-xs">{u.email}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell><RoleChip role={u.role} /></Table.Cell>
                    <Table.Cell><span className="text-muted text-sm">{u.department}</span></Table.Cell>
                    <Table.Cell><StatusChip status={u.status} /></Table.Cell>
                    <Table.Cell><span className="text-muted text-sm">{u.joinedAt}</span></Table.Cell>
                    <Table.Cell><span className="text-muted text-sm">{u.lastActive}</span></Table.Cell>
                    <Table.Cell>
                      <Dropdown>
                        <Button isIconOnly size="sm" variant="ghost" aria-label={`操作 ${u.name}`}>
                          <MoreHorizontal className="text-muted size-4" />
                        </Button>
                        <Dropdown.Popover placement="bottom end">
                          <Dropdown.Menu aria-label="用户操作">
                            <Dropdown.Item id="edit" textValue="编辑用户" onAction={() => openEdit(u)}>
                              <UserCog className="size-4" /> 编辑用户
                            </Dropdown.Item>
                            <Dropdown.Item id="delete" textValue="删除用户" variant="danger" onAction={() => { setDeleting(u); setDeleteOpen(true); }}>
                              <Trash2 className="size-4" /> 删除用户
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          <Table.Footer className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_1fr]">
            <span className="text-muted justify-self-start text-xs whitespace-nowrap">
              显示 {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} 条，共 {filtered.length} 条
            </span>
            <Pagination className="justify-self-center">
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous isDisabled={safePage === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                    <Pagination.PreviousIcon />
                  </Pagination.Previous>
                </Pagination.Item>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => (
                    <span className="flex items-center" key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && <span className="text-muted px-1">…</span>}
                      <Pagination.Item>
                        <Pagination.Link isActive={p === safePage} onPress={() => setPage(p)}>{p}</Pagination.Link>
                      </Pagination.Item>
                    </span>
                  ))}
                <Pagination.Item>
                  <Pagination.Next isDisabled={safePage === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
            <div className="flex items-center justify-self-end gap-1.5">
              <span className="text-muted mr-0.5 text-xs">每页</span>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={pageSize === n ? "primary" : "ghost"}
                  className="min-w-9 px-2.5 text-xs"
                  onPress={() => { setPageSize(n); setPage(1); }}
                >
                  {n}
                </Button>
              ))}
              <span className="text-muted ml-0.5 text-xs">条</span>
            </div>
          </Table.Footer>
        </Table>
      </div>

      {/* Create / Edit modal */}
      <Modal isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[460px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{editing ? "编辑成员" : "添加成员"}</Modal.Heading>
              </Modal.Header>
              <form onSubmit={handleFormSubmit}>
                <Modal.Body>
                  <div className="space-y-4">
                    {editing ? (
                      <div className="bg-default rounded-lg p-3 text-xs leading-relaxed">
                        <p className="text-foreground font-medium">{editing.name} · {editing.email}</p>
                        <p className="text-muted mt-1">账号资料由成员在个人中心自行修改，此处仅调整组织内角色与部门。</p>
                      </div>
                    ) : (
                      <TextField isRequired className="w-full">
                        <Label>邮箱或手机号</Label>
                        <Input className="w-full" name="email" placeholder="colleague@company.com" />
                      </TextField>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Select name="role" className="w-full" defaultSelectedKey={editing?.workspaceRole || "member"}>
                        <Label>组织角色</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox aria-label="选择组织角色">
                            <ListBox.Item id="admin" textValue="管理员">管理员</ListBox.Item>
                            <ListBox.Item id="member" textValue="成员">成员</ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <Select name="department" className="w-full" defaultSelectedKey={editing?.departmentId ?? "none"}>
                        <Label>所在部门</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox aria-label="选择所在部门">
                            <ListBox.Item id="none" textValue="未分组">未分组</ListBox.Item>
                            {departmentNodes.map((d) => (
                              <ListBox.Item key={d.id} id={d.id} textValue={d.name}>{d.name}</ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                    {!editing && (
                      <div className="bg-accent/5 rounded-lg p-3 text-xs leading-relaxed text-muted">
                        若账号已注册将直接加入组织并生效角色；否则生成邀请，对方注册后自动加入。
                      </div>
                    )}
                    {formError && <p className="bg-danger/10 text-danger rounded-lg px-3 py-2 text-xs">{formError}</p>}
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="tertiary" onPress={() => setDialogOpen(false)}>取消</Button>
                  <Button type="submit" variant="primary">{editing ? "保存修改" : "添加成员"}</Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[400px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>确认删除用户？</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-muted text-sm leading-relaxed">
                  你即将删除 <span className="text-foreground font-semibold">{deleting?.name}</span>（{deleting?.email}）。此操作无法撤销。
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
