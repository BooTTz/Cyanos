import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Building2,
  Camera,
  Check,
  ClipboardList,
  Clock3,
  Inbox,
  KeyRound,
  LogOut,
  MapPin,
  Moon,
  MoreHorizontal,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  TriangleAlert,
  UserPlus,
  UserRound,
  UserRoundX,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { Avatar, Button, Dropdown, InputGroup, Label, Modal, Pagination, Select, ListBox, Switch, Table, Tabs, TextField } from "@heroui/react";

import { PageHeader, UserAvatar } from "@/components/ui";
import { DELETION_GRACE_DAYS, orgTypeLabels, roleLabels, workspaceRoleLabels, type OrgType, type UserRole, type Workspace, type WorkspaceRole } from "@/lib/types";
import {
  deletionDaysLeft,
  getLastWorkspaceId,
  tenantActions,
  useAccountWorkspaces,
  useIncomingInvitations,
  useTenantStore,
  useWorkspaceMembers,
} from "@/lib/tenant-store";
import { useAuth } from "@/provider";
import { useThemeMode } from "@/lib/use-theme";

/* ---------------- 组织管理（多租户） ---------------- */

function OrganizationManager() {
  const { user, switchWorkspace } = useAuth();
  const navigate = useNavigate();
  const workspaces = useAccountWorkspaces(user?.id ?? null);
  const activeId = user?.workspaceId ?? null;
  const workspaceIds = workspaces.map((w) => w.workspace.id);
  // 多组织默认选中上次进入的组织；仅一个组织时默认选中它。
  // useState 初始化在 API 模式下可能早于快照，因此每次渲染都按可用列表做一次兜底。
  const fallbackId = activeId && workspaceIds.includes(activeId)
    ? activeId
    : workspaces.length === 1
      ? workspaceIds[0]
      : (() => {
          const last = getLastWorkspaceId();
          return last && workspaceIds.includes(last) ? last : null;
        })();
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const selectedId = manualSelectedId && workspaceIds.includes(manualSelectedId) ? manualSelectedId : fallbackId;
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [inviteError, setInviteError] = useState("");
  const [inviteDone, setInviteDone] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<Workspace | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deletionTarget, setDeletionTarget] = useState<Workspace | null>(null);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  // 成员管理：展开选中组织的成员列表（与用户管理同款表格 + 分页）
  const [memberManageOpen, setMemberManageOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(10);
  const [kickTarget, setKickTarget] = useState<{ membershipId: string; name: string } | null>(null);
  const [kickOpen, setKickOpen] = useState(false);

  const showNotice = (message: string) => {
    setInviteDone(message);
    setTimeout(() => setInviteDone(""), 3200);
  };

  // 选中的组织：手动点击 > 当前工作空间 > 上次进入的组织 > 单组织自动选中
  const effectiveId = selectedId;
  const selectedEntry = workspaces.find((w) => w.workspace.id === effectiveId) ?? null;
  const selectedWorkspace = selectedEntry?.workspace ?? null;
  const tenant = useTenantStore();
  const memberCountOf = (workspaceId: string) => tenant.memberships.filter((m) => m.workspaceId === workspaceId).length;
  const pendingCountOf = (workspaceId: string) => tenant.invitations.filter((i) => i.workspaceId === workspaceId && i.status === "pending").length;

  // 成员管理列表：当前选中组织的全部成员（含创建者），派生视图模型
  const memberRows = useMemo(() => {
    const wsId = effectiveId;
    if (!wsId) return [];
    return tenant.memberships
      .filter((m) => m.workspaceId === wsId)
      .map((m) => {
        const account = tenant.accounts.find((a) => a.id === m.accountId);
        return {
          membershipId: m.id,
          accountId: m.accountId,
          name: account?.name ?? "未知账号",
          account: account?.email || account?.phone || "—",
          avatarColor: account?.avatarColor ?? "oklch(0.62 0.24 292)",
          // 组织内角色关联「角色与权限」：owner/admin → 管理员，member → 成员
          userRole: (m.role === "member" ? "member" : "admin") as UserRole,
          workspaceRole: m.role,
          joinedAt: m.joinedAt,
          status: m.status,
        };
      });
  }, [effectiveId, tenant.memberships, tenant.accounts]);
  const filteredMemberRows = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return memberRows;
    return memberRows.filter((r) => r.name.toLowerCase().includes(q) || r.account.toLowerCase().includes(q));
  }, [memberRows, memberQuery]);
  const memberTotalPages = Math.max(1, Math.ceil(filteredMemberRows.length / memberPageSize));
  const memberSafePage = Math.min(memberPage, memberTotalPages);
  const pagedMemberRows = filteredMemberRows.slice((memberSafePage - 1) * memberPageSize, memberSafePage * memberPageSize);

  const openMemberManage = () => {
    setMemberQuery("");
    setMemberPage(1);
    setMemberManageOpen(true);
  };

  const confirmKick = () => {
    if (!kickTarget) return;
    tenantActions.removeMembership(kickTarget.membershipId);
    setKickOpen(false);
    setKickTarget(null);
    showNotice("已将成员移出组织");
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const data = new FormData(e.currentTarget);
    const created = tenantActions.createWorkspace(
      {
        name: String(data.get("name") || "").trim(),
        code: String(data.get("code") || "").trim(),
        type: String(data.get("type") || "company") as OrgType,
        description: String(data.get("description") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        address: String(data.get("address") || "").trim(),
      },
      user.id,
    );
    setCreateOpen(false);
    setManualSelectedId(created.id);
    navigate("/dashboard"); // 创建后进入实际功能首页
  };

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedWorkspace) return;
    const result = tenantActions.invite({ workspaceId: selectedWorkspace.id, email: inviteEmail, role: inviteRole, invitedBy: user.id });
    if (result.error) {
      setInviteError(result.error);
      setInviteDone("");
    } else {
      setInviteError("");
      setInviteDone("邀请已发送，对方接受后加入组织");
      setTimeout(() => { setInviteDone(""); setInviteOpen(false); }, 2200);
    }
  };

  const enterWorkspace = (workspaceId: string) => {
    switchWorkspace(workspaceId);
    navigate("/dashboard");
  };

  const confirmLeave = () => {
    if (!leaveTarget || !user) return;
    const err = tenantActions.leaveWorkspace(leaveTarget.id, user.id);
    if (err) {
      showNotice(err);
      return;
    }
    setLeaveOpen(false);
    setLeaveTarget(null);
    setManualSelectedId(null);
    showNotice("已退出组织，如需返回请联系管理员重新邀请");
  };

  const confirmWorkspaceDeletion = () => {
    if (!deletionTarget || !user) return;
    const err = tenantActions.requestWorkspaceDeletion(deletionTarget.id, user.id, deletionReason);
    if (err) {
      showNotice(err);
      return;
    }
    setDeletionOpen(false);
    setDeletionTarget(null);
    setDeletionReason("");
    setManualSelectedId(deletionTarget.id);
    showNotice(`注销申请已提交，${DELETION_GRACE_DAYS} 天内可在更多菜单恢复`);
  };

  const restoreWorkspace = (workspace: Workspace) => {
    if (!user) return;
    const err = tenantActions.cancelWorkspaceDeletion(workspace.id, user.id);
    if (err) showNotice(err);
    else showNotice("已恢复组织，可正常进入工作台");
    setMenuOpenId(null);
  };

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-foreground font-semibold">我的组织</h2>
        <Button size="sm" variant="primary" onPress={() => setCreateOpen(true)}>
          <Plus className="size-4" /> 创建组织
        </Button>
      </div>

      {workspaces.length === 0 ? (
        /* 无组织：默认背景 + 引导 */
        <div className="neon-card relative overflow-hidden rounded-2xl p-8 text-center">
          <div className="from-accent/15 via-transparent to-[var(--brand-green-strong)]/10 pointer-events-none absolute inset-0 bg-gradient-to-br" />
          <div className="blob blob-purple -top-16 -left-10 size-52 bg-fuchsia-400/20" />
          <div className="blob blob-green -right-10 -bottom-16 size-52 bg-emerald-400/20" />
          <div className="relative">
            <span className="bg-accent/12 text-accent mx-auto flex size-14 items-center justify-center rounded-2xl">
              <Building2 className="size-7" />
            </span>
            <h3 className="text-foreground mt-4 text-lg font-semibold">开始创建或加入你的第一个组织</h3>
            <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">
              组织是你与团队协作的工作空间。创建后你将成为管理员，可邀请同事加入；也可以在下方消息待办中接受他人邀请。
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" onPress={() => setCreateOpen(true)}>
                <Plus className="size-4" /> 创建组织
              </Button>
              <span className="text-muted text-xs">或等待管理员邀请你加入</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workspaces.map(({ workspace, membership }) => {
            const active = workspace.id === activeId;
            const selected = workspace.id === effectiveId;
            const deleting = !!workspace.deletionRequestedAt;
            const Icon = workspace.type === "contractor" ? Workflow : Building2;
            const memberCount = memberCountOf(workspace.id);
            const pendingCount = pendingCountOf(workspace.id);
            // 下拉项 id 必须保持稳定：HeroUI 在切换菜单项 id 时会抛错并卸载整棵 React 树。
            const moreMenu = membership.role === "owner" ? (
              <div className="ml-auto" onMouseEnter={() => setMenuOpenId(workspace.id)}>
                <Dropdown
                  isOpen={menuOpenId === workspace.id}
                  onOpenChange={(open) => setMenuOpenId(open ? workspace.id : null)}
                >
                  <Dropdown.Trigger
                    aria-label={`${workspace.name} 更多操作`}
                    className="text-muted hover:bg-default/70 hover:text-foreground flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="size-4" />
                  </Dropdown.Trigger>
                  <Dropdown.Popover placement="top end">
                    <Dropdown.Menu aria-label={`${workspace.name} 更多操作`}>
                      <Dropdown.Item
                        id="workspace-deletion"
                        textValue={deleting ? "注销恢复" : "注销组织"}
                        onAction={() => {
                          setMenuOpenId(null);
                          if (deleting) {
                            restoreWorkspace(workspace);
                          } else {
                            setDeletionTarget(workspace);
                            setDeletionReason("");
                            setDeletionOpen(true);
                          }
                        }}
                      >
                        <span className={deleting ? "text-[var(--brand-green-deep)] flex items-center gap-2" : "text-danger flex items-center gap-2"}>
                          {deleting ? <RotateCcw className="size-4" /> : <Trash2 className="size-4" />}
                          {deleting ? "注销恢复" : "注销组织"}
                        </span>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            ) : null;
            return (
              <div
                key={workspace.id}
                className={`neon-card group relative flex min-h-[184px] flex-col rounded-2xl transition-all ${
                  selected
                    ? "border-accent shadow-[0_0_0_1px_var(--accent),0_18px_44px_-24px_var(--glow-purple)]"
                    : "hover:border-accent/40"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setManualSelectedId(workspace.id)}
                  className="flex flex-1 items-start gap-3 rounded-t-2xl p-5 pb-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  aria-pressed={selected}
                >
                  <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${selected || active ? "bg-brand-gradient text-white" : "bg-accent/10 text-accent"}`}>
                    {workspace.logo ? <img src={workspace.logo} alt="" className="size-9 rounded-lg object-cover" /> : <Icon className="size-[22px]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-foreground truncate text-sm font-semibold">{workspace.name}</span>
                      {deleting ? (
                        <span className="bg-danger/12 text-danger shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
                          注销中 · {deletionDaysLeft(workspace.deletionExpiresAt)} 天
                        </span>
                      ) : (
                        active && <span className="bg-success/12 text-success shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">当前</span>
                      )}
                    </span>
                    <span className="text-muted mt-1 block truncate text-[11px]">
                      {workspace.code} · {orgTypeLabels[workspace.type]}
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="bg-accent/10 text-accent rounded-md px-2 py-1 text-[10px] font-medium">{membershipsLabel(membership.role)}</span>
                      <span className="bg-default/60 text-muted inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px]">
                        <UsersRound className="size-3" /> {memberCount} 名成员
                      </span>
                      {pendingCount > 0 && !deleting && (
                        <span className="bg-warning/12 text-warning inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px]">
                          <Clock3 className="size-3" /> {pendingCount} 待接受
                        </span>
                      )}
                    </span>
                  </span>
                </button>

                {selected && (
                  <div className="border-separator bg-accent/[0.03] mt-auto flex flex-wrap items-center gap-2 border-t px-5 py-3.5">
                    {deleting ? (
                      <>
                        <span className="text-muted flex-1 text-[11px]">注销申请中，组织已冻结；可从右侧更多操作恢复。</span>
                        <Button size="sm" variant="outline" isDisabled>
                          <ArrowRight className="size-4" /> 注销中
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="primary" className="button--primary" onPress={() => enterWorkspace(workspace.id)}>
                          <ArrowRight className="size-4" /> 进入工作台
                        </Button>
                        {(membership.role === "owner" || membership.role === "admin") && (
                          <>
                            <Button size="sm" variant="outline" onPress={openMemberManage}>
                              <UsersRound className="size-4" /> 成员管理
                            </Button>
                            <Button size="sm" variant="outline" onPress={() => setInviteOpen(true)}>
                              <UserPlus className="size-4" /> 邀请成员
                            </Button>
                          </>
                        )}
                        {membership.role !== "owner" && (
                          <Button size="sm" variant="ghost" onPress={() => { setLeaveTarget(workspace); setLeaveOpen(true); }}>
                            <LogOut className="size-4" /> 退出组织
                          </Button>
                        )}
                      </>
                    )}
                    {moreMenu}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 消息待办：收到的邀请 + 快捷操作 */}
      <MessageTodo notice={inviteDone} />

      {/* 创建组织 */}
      <Modal isOpen={createOpen} onOpenChange={setCreateOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[520px]">
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>创建组织</Modal.Heading></Modal.Header>
          <form onSubmit={handleCreate}>
            <Modal.Body>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="name" isRequired className="w-full sm:col-span-2">
                  <Label>组织名称</Label>
                  <InputGroup><InputGroup.Prefix><Building2 className="text-muted size-4" /></InputGroup.Prefix><InputGroup.Input placeholder="例如：华远智造科技有限公司" /></InputGroup>
                </TextField>
                <TextField name="code" className="w-full">
                  <Label>组织编码</Label>
                  <InputGroup><InputGroup.Input placeholder="例如：HY-ZZ" /></InputGroup>
                </TextField>
                <Select name="type" className="w-full" defaultSelectedKey="company">
                  <Label>组织类型</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover><ListBox aria-label="选择组织类型">
                    {(Object.keys(orgTypeLabels) as OrgType[]).map((t) => (
                      <ListBox.Item key={t} id={t} textValue={orgTypeLabels[t]}>{orgTypeLabels[t]}</ListBox.Item>
                    ))}
                  </ListBox></Select.Popover>
                </Select>
                <TextField name="phone" className="w-full">
                  <Label>联系电话</Label>
                  <InputGroup><InputGroup.Prefix><Phone className="text-muted size-4" /></InputGroup.Prefix><InputGroup.Input placeholder="联系电话" /></InputGroup>
                </TextField>
                <TextField name="address" className="w-full">
                  <Label>所在地址</Label>
                  <InputGroup><InputGroup.Input placeholder="办公地址" /></InputGroup>
                </TextField>
                <TextField name="description" className="w-full sm:col-span-2">
                  <Label>组织说明</Label>
                  <InputGroup><InputGroup.Input placeholder="一句话介绍你的组织" /></InputGroup>
                </TextField>
                <p className="text-muted col-span-2 text-xs">创建后你将成为该组织的管理员，可邀请其他账号加入。组织 Logo 暂使用默认图标展示。</p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="tertiary" onPress={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" variant="primary">创建组织</Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      {/* 邀请成员 */}
      <Modal isOpen={inviteOpen} onOpenChange={setInviteOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[420px]">
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>邀请成员加入组织</Modal.Heading></Modal.Header>
          <form onSubmit={handleInvite}>
            <Modal.Body>
              <div className="space-y-4">
                <p className="text-muted rounded-lg bg-accent/5 p-3 text-xs leading-relaxed">
                  邀请 <span className="text-foreground font-medium">{selectedWorkspace?.name}</span>。对方需在个人中心「消息待办」中接受后才会加入组织。
                </p>
                <TextField isRequired className="w-full">
                  <Label>邮箱或手机号</Label>
                  <InputGroup><InputGroup.Prefix><UserPlus className="text-muted size-4" /></InputGroup.Prefix><InputGroup.Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" /></InputGroup>
                </TextField>
                <Select className="w-full" defaultSelectedKey="member" onSelectionChange={(k) => setInviteRole(String(k) as WorkspaceRole)}>
                  <Label>成员角色</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover><ListBox aria-label="选择成员角色">
                    <ListBox.Item id="admin" textValue="管理员">管理员</ListBox.Item>
                    <ListBox.Item id="member" textValue="成员">成员</ListBox.Item>
                  </ListBox></Select.Popover>
                </Select>
                {inviteError && <p className="bg-danger/10 text-danger rounded-lg px-3 py-2 text-xs">{inviteError}</p>}
                {inviteDone && <p className="bg-success/10 text-success rounded-lg px-3 py-2 text-xs">{inviteDone}</p>}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="tertiary" onPress={() => setInviteOpen(false)}>取消</Button>
              <Button type="submit" variant="primary">发送邀请</Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      {/* 成员管理：与用户管理同款列表，展示选中组织的全部成员 */}
      <Modal isOpen={memberManageOpen} onOpenChange={setMemberManageOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[920px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>成员管理 · {selectedWorkspace?.name ?? "组织"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3 flex items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  aria-label="搜索成员"
                  value={memberQuery}
                  onChange={(e) => { setMemberQuery(e.target.value); setMemberPage(1); }}
                  placeholder="搜索姓名、账号…"
                  className="bg-default border-separator text-foreground placeholder:text-muted focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none transition-colors"
                />
              </div>
              <span className="text-muted ml-auto text-xs">共 {filteredMemberRows.length} 名成员</span>
            </div>
            <Table variant="secondary" className="neon-card overflow-hidden rounded-2xl">
              <Table.ScrollContainer className="table-scroll max-h-[clamp(300px,46vh,480px)] overflow-y-auto">
                <Table.Content aria-label="组织成员列表" className="min-w-[640px]">
                  <Table.Header className="bg-[var(--surface-secondary)] sticky top-0 z-10">
                    <Table.Column isRowHeader>用户名</Table.Column>
                    <Table.Column>账号</Table.Column>
                    <Table.Column>组织内角色</Table.Column>
                    <Table.Column>加入时间</Table.Column>
                    <Table.Column aria-label="操作" />
                  </Table.Header>
                  <Table.Body>
                    {pagedMemberRows.map((r) => {
                      const isOwner = r.workspaceRole === "owner";
                      const isSelf = r.accountId === user?.id;
                      return (
                        <Table.Row key={r.membershipId}>
                          <Table.Cell>
                            <div className="flex items-center gap-3">
                              <UserAvatar name={r.name} color={r.avatarColor} />
                              <div>
                                <p className="text-foreground text-sm font-medium">{r.name}</p>
                                {isSelf && <p className="text-muted text-[10px]">你</p>}
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell><span className="text-muted text-xs">{r.account}</span></Table.Cell>
                          <Table.Cell>
                            <span className="text-foreground text-xs">
                              {workspaceRoleLabels[r.workspaceRole]} · {roleLabels[r.userRole]}
                              {isOwner && <span className="text-muted">（不可移出）</span>}
                            </span>
                          </Table.Cell>
                          <Table.Cell><span className="text-muted text-xs">{r.joinedAt}</span></Table.Cell>
                          <Table.Cell>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              aria-label={`踢出 ${r.name}`}
                              isDisabled={isOwner || isSelf}
                              className="text-danger"
                              onPress={() => { setKickTarget({ membershipId: r.membershipId, name: r.name }); setKickOpen(true); }}
                            >
                              <UserRoundX className="size-4" />
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                    {pagedMemberRows.length === 0 && (
                      <Table.Row><Table.Cell colSpan={5}><p className="text-muted py-8 text-center text-xs">没有匹配的成员</p></Table.Cell></Table.Row>
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
              <Table.Footer className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_1fr]">
                <span className="text-muted justify-self-start text-xs whitespace-nowrap">
                  显示 {filteredMemberRows.length === 0 ? 0 : (memberSafePage - 1) * memberPageSize + 1}–{Math.min(memberSafePage * memberPageSize, filteredMemberRows.length)} 条，共 {filteredMemberRows.length} 条
                </span>
                <Pagination className="justify-self-center">
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous isDisabled={memberSafePage === 1} onPress={() => setMemberPage((p) => Math.max(1, p - 1))}>
                        <Pagination.PreviousIcon />
                      </Pagination.Previous>
                    </Pagination.Item>
                    {Array.from({ length: memberTotalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === memberTotalPages || Math.abs(p - memberSafePage) <= 1)
                      .map((p, idx, arr) => (
                        <span className="flex items-center" key={p}>
                          {idx > 0 && p - arr[idx - 1] > 1 && <span className="text-muted px-1">…</span>}
                          <Pagination.Item>
                            <Pagination.Link isActive={p === memberSafePage} onPress={() => setMemberPage(p)}>{p}</Pagination.Link>
                          </Pagination.Item>
                        </span>
                      ))}
                    <Pagination.Item>
                      <Pagination.Next isDisabled={memberSafePage === memberTotalPages} onPress={() => setMemberPage((p) => Math.min(memberTotalPages, p + 1))}>
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
                <div className="flex items-center justify-self-end gap-1.5">
                  <span className="text-muted mr-0.5 text-xs">每页</span>
                  {[10, 25, 50].map((n) => (
                    <Button key={n} size="sm" variant={memberPageSize === n ? "primary" : "ghost"} className="min-w-9 px-2.5 text-xs" onPress={() => { setMemberPageSize(n); setMemberPage(1); }}>
                      {n}
                    </Button>
                  ))}
                  <span className="text-muted ml-0.5 text-xs">条</span>
                </div>
              </Table.Footer>
            </Table>
            <p className="text-muted mt-3 text-[11px] leading-relaxed">
              组织内角色由创建者/管理员在用户管理中调整；移出成员后，对方将立即失去该组织的访问权限，如需返回需重新邀请。
            </p>
          </Modal.Body>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      {/* 踢出成员确认 */}
      <Modal isOpen={kickOpen} onOpenChange={setKickOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[440px]">
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>确认移出成员？</Modal.Heading></Modal.Header>
          <Modal.Body>
            <div className="border-danger/25 bg-danger/8 rounded-xl border p-4">
              <div className="flex gap-3">
                <TriangleAlert className="text-danger mt-0.5 size-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium">即将移出「{kickTarget?.name}」</p>
                  <p className="text-muted mt-2 text-xs leading-relaxed">
                    移出后该成员将立即失去本组织的所有访问权限，工作台与业务数据不再可见。
                    如需返回，需要由创建者或管理员重新邀请。
                  </p>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setKickOpen(false)}>取消</Button>
            <Button variant="danger" className="button--danger" onPress={confirmKick}>确认移出</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      {/* 退出组织警告 */}
      <Modal isOpen={leaveOpen} onOpenChange={setLeaveOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[460px]">
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>确认退出组织？</Modal.Heading></Modal.Header>
          <Modal.Body>
            <div className="border-danger/25 bg-danger/8 rounded-xl border p-4">
              <div className="flex gap-3">
                <TriangleAlert className="text-danger mt-0.5 size-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium">
                    即将退出「{leaveTarget?.name}」
                  </p>
                  <p className="text-muted mt-2 text-xs leading-relaxed">
                    退出后你将立即失去该组织的所有访问权限，工作台、成员信息与业务数据将不再对你可见。
                    如需返回，需要组织管理员重新邀请你加入。
                  </p>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setLeaveOpen(false)}>取消</Button>
            <Button variant="danger" className="button--danger" onPress={confirmLeave}>确认退出</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      {/* 申请注销组织 */}
      <Modal isOpen={deletionOpen} onOpenChange={setDeletionOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[520px]">
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>申请注销组织</Modal.Heading></Modal.Header>
          <div>
            <Modal.Body>
              <div className="space-y-4">
                <div className="border-danger/25 bg-danger/8 rounded-xl border p-4">
                  <div className="flex gap-3">
                    <TriangleAlert className="text-danger mt-0.5 size-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium">注销「{deletionTarget?.name}」</p>
                      <p className="text-muted mt-2 text-xs leading-relaxed">
                        提交后组织进入 {DELETION_GRACE_DAYS} 天冷静期：组织卡片保留但所有人无法进入，数据仍暂存。
                        超管同意或 {DELETION_GRACE_DAYS} 天期满后立即注销，组织、成员关系与业务数据将被删除且不可恢复。
                      </p>
                    </div>
                  </div>
                </div>
                <TextField isRequired className="w-full">
                  <Label>注销原因</Label>
                  <InputGroup>
                    <InputGroup.Input
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      placeholder="例如：业务调整，组织不再使用"
                    />
                  </InputGroup>
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => setDeletionOpen(false)}>取消</Button>
              <Button
                variant="danger"
                className="button--danger"
                isDisabled={!deletionReason.trim()}
                onPress={confirmWorkspaceDeletion}
              >
                提交注销申请
              </Button>
            </Modal.Footer>
          </div>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>
    </section>
  );
}

/** 消息待办：只处理收到的组织邀请，工作台入口统一留在组织卡片内 */
function MessageTodo({ notice }: { notice: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const incoming = useIncomingInvitations(user?.id ?? null);
  const [actionError, setActionError] = useState("");

  const accept = (invitationId: string) => {
    if (!user) return;
    const err = tenantActions.acceptInvitation(invitationId, user.id);
    if (err) setActionError(err);
    else navigate("/dashboard"); // 接受后直接进入组织工作台
  };
  const decline = (invitationId: string) => {
    if (!user) return;
    const err = tenantActions.declineInvitation(invitationId, user.id);
    if (err) setActionError(err);
  };

  return (
    <section className="neon-card mt-6 overflow-hidden rounded-2xl" aria-label="消息待办">
      <div className="border-separator flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="bg-accent/12 text-accent flex size-10 items-center justify-center rounded-xl"><Inbox className="size-5" /></span>
          <div>
            <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
              消息待办
              {incoming.length > 0 && <span className="bg-danger text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none">{incoming.length}</span>}
            </h2>
          </div>
        </div>
        <ClipboardList className="text-muted/60 size-5" />
      </div>

      <div className="px-5 py-4">
        {(notice || actionError) && (
          <p className={`${actionError ? "bg-danger/10 text-danger" : "bg-success/10 text-success"} mb-4 rounded-lg px-3 py-2 text-xs`}>
            {actionError || notice}
          </p>
        )}

        {incoming.length > 0 ? (
          <ul className="space-y-3">
            {incoming.map(({ invitation, workspace, inviter }) => (
              <li key={invitation.id} className="bg-default/40 border-separator flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
                <span className="bg-accent/10 text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
                  {workspace?.type === "contractor" ? <Workflow className="size-[18px]" /> : <Building2 className="size-[18px]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">
                    {inviter?.name ?? "组织管理员"} 邀请你加入「{workspace?.name ?? "组织"}」
                  </p>
                  <p className="text-muted mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="bg-accent/10 text-accent rounded-md px-2 py-0.5">{invitation.role === "admin" ? "管理员" : "成员"}身份</span>
                    <span>{invitation.createdAt}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="primary" className="button--primary" onPress={() => accept(invitation.id)}>
                    <Check className="size-4" /> 接受
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => decline(invitation.id)}>
                    <X className="size-4" /> 忽略
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-separator bg-default/35 flex items-center gap-3 rounded-xl border border-dashed px-4 py-5">
            <span className="bg-success/12 text-[var(--brand-green-deep)] flex size-10 shrink-0 items-center justify-center rounded-xl"><Check className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">暂无待处理邀请</p>
              <p className="text-muted mt-1 text-xs">收到组织邀请后，可在这里接受或忽略；接受后会自动加入对应组织。</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function membershipsLabel(role: WorkspaceRole): string {
  return role === "owner" ? "创建者" : role === "admin" ? "管理员" : "成员";
}

/* ---------------- 个人资料 ---------------- */

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    updateProfile({
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      bio: String(data.get("bio") || ""),
      phone: String(data.get("phone") || ""),
      location: String(data.get("location") || ""),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-3">
      <div className="neon-card rounded-2xl p-6 text-center shadow-sm">
        <div className="relative mx-auto w-fit">
          <Avatar className="size-24 text-2xl">
            <Avatar.Fallback className="text-white" style={{ background: user?.avatarColor }}>{user?.name?.slice(0, 1)}</Avatar.Fallback>
          </Avatar>
          <button aria-label="更换头像" type="button" className="border-separator bg-surface text-muted hover:text-accent absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border shadow-sm transition-colors">
            <Camera className="size-4" />
          </button>
        </div>
        <h3 className="text-foreground mt-4 font-semibold">{user?.name}</h3>
        <p className="text-muted mt-1 text-sm">{user?.email || user?.phone}</p>
        <span className="bg-accent/10 text-accent mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium">
          {user?.isSuperAdmin ? "超级管理员" : user ? "成员" : ""}
        </span>
        <div className="border-separator text-muted mt-6 grid grid-cols-3 gap-2 border-t pt-5 text-center text-xs">
          <div><p className="text-foreground text-base font-bold">{useAccountWorkspaces(user?.id ?? null).length}</p><p>组织</p></div>
          <div><p className="text-foreground text-base font-bold">{useWorkspaceMembers(user?.workspaceId ?? null).length}</p><p>成员</p></div>
          <div><p className="text-foreground text-base font-bold">—</p><p>成就</p></div>
        </div>
      </div>

      <div className="neon-card rounded-2xl p-6 lg:col-span-2">
        <h3 className="text-foreground font-semibold">基本资料</h3>
        <p className="text-muted mt-1 text-xs">更新你的个人信息和公开资料。</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <TextField name="name" defaultValue={user?.name} className="w-full">
            <Label>姓名</Label>
            <InputGroup><InputGroup.Prefix><UserRound className="text-muted size-4" /></InputGroup.Prefix><InputGroup.Input /></InputGroup>
          </TextField>
          <TextField name="email" type="email" defaultValue={user?.email} className="w-full" isDisabled={!user?.email}>
            <Label>邮箱地址</Label>
            <InputGroup><InputGroup.Input /></InputGroup>
          </TextField>
          <TextField name="phone" defaultValue={user?.phone} className="w-full">
            <Label>联系电话</Label>
            <InputGroup><InputGroup.Prefix><Phone className="text-muted size-4" /></InputGroup.Prefix><InputGroup.Input /></InputGroup>
          </TextField>
          <TextField name="location" defaultValue={user?.location} className="w-full">
            <Label>所在地区</Label>
            <InputGroup><InputGroup.Prefix><MapPin className="text-muted size-4" /></InputGroup.Prefix><InputGroup.Input /></InputGroup>
          </TextField>
          <TextField name="bio" defaultValue={user?.bio} className="w-full sm:col-span-2">
            <Label>个人简介</Label>
            <InputGroup><InputGroup.Input placeholder="介绍一下你自己…" /></InputGroup>
          </TextField>
        </div>
        <div className="border-separator mt-6 flex items-center justify-end gap-3 border-t pt-5">
          {saved && <span className="text-success flex items-center gap-1 text-sm"><Check className="size-4" /> 已保存</span>}
          <Button type="submit" variant="primary">保存更改</Button>
        </div>
      </div>
    </form>
  );
}

function SecurityTab() {
  const { user } = useAuth();
  const store = useTenantStore();
  const account = store.accounts.find((a) => a.id === user?.id) ?? null;
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = account?.status === "pending-deletion";
  const daysLeft = deletionDaysLeft(account?.deletionExpiresAt);

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3200);
  };

  const submitDeletion = () => {
    if (!user) return;
    const err = tenantActions.requestAccountDeletion(user.id, reason);
    if (err) {
      showNotice(err);
      return;
    }
    setOpen(false);
    setReason("");
    showNotice(`注销申请已提交，${DELETION_GRACE_DAYS} 天内可恢复`);
  };

  const restoreAccount = () => {
    if (!user) return;
    const err = tenantActions.cancelAccountDeletion(user.id);
    showNotice(err ?? "账户已恢复，可正常使用全部功能");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="neon-card rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <span className="bg-accent/12 text-accent flex size-10 items-center justify-center rounded-lg"><KeyRound className="size-5" /></span>
          <div><h3 className="text-foreground font-semibold">修改密码</h3><p className="text-muted text-xs">建议定期更新密码以保障账户安全。</p></div>
        </div>
        <p className="text-muted bg-default mt-4 rounded-lg p-3 text-xs leading-relaxed">
          密码修改将在后续版本开放；当前账户安全由注册验证码与会话令牌保护。
        </p>
      </div>
      <div className="space-y-5">
        <div className="neon-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="bg-success/15 text-[var(--brand-green-deep)] flex size-10 items-center justify-center rounded-lg"><ShieldCheck className="size-5" /></span>
            <div><h3 className="text-foreground font-semibold">两步验证</h3><p className="text-muted text-xs">为账户增加一层额外保护。</p></div>
            <Switch className="ms-auto" defaultSelected><Switch.Control><Switch.Thumb /></Switch.Control></Switch>
          </div>
          <p className="text-muted bg-default mt-4 rounded-lg p-3 text-xs leading-relaxed">
            <Check className="text-success mr-1 inline size-3.5" /> 注册时已通过验证码校验你的联系方式。
          </p>
        </div>

        <div className="neon-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="bg-warning/15 text-warning flex size-10 items-center justify-center rounded-lg"><Smartphone className="size-5" /></span>
            <div><h3 className="text-foreground font-semibold">登录设备</h3><p className="text-muted text-xs">管理已登录的设备会话。</p></div>
          </div>
          <ul className="mt-4 space-y-3">
            <li className="flex items-center justify-between text-sm">
              <span><span className="text-foreground font-medium">当前浏览器</span><span className="text-muted block text-xs">当前会话</span></span>
              <span className="bg-success/12 text-success rounded-full px-2 py-0.5 text-xs">当前</span>
            </li>
          </ul>
        </div>

        <div className="border-danger/25 bg-danger/[0.04] rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <span className="bg-danger/12 text-danger flex size-10 items-center justify-center rounded-lg"><TriangleAlert className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="text-foreground font-semibold">注销账户</h3>
              <p className="text-muted mt-0.5 text-xs">提交后进入 {DELETION_GRACE_DAYS} 天冷静期，可随时恢复。</p>
            </div>
            {pending && (
              <span className="bg-danger/12 text-danger shrink-0 rounded-full px-2 py-1 text-[10px] font-medium">
                注销中 · {daysLeft} 天
              </span>
            )}
          </div>

          {notice && (
            <p className={`${notice.includes("不可") || notice.includes("仅") ? "bg-danger/10 text-danger" : "bg-success/10 text-success"} mt-4 rounded-lg px-3 py-2 text-xs`}>
              {notice}
            </p>
          )}

          <div className="border-danger/20 mt-4 border-t pt-4">
            {pending ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-muted flex-1 text-xs leading-relaxed">
                  已提交注销原因：{account?.deletionReason || "—"}。冷静期内无法进入组织工作台，超管同意或期满后账号将永久注销。
                </p>
                <Button size="sm" variant="outline" onPress={restoreAccount}>
                  <RotateCcw className="size-4" /> 注销恢复
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-muted flex-1 text-xs leading-relaxed">
                  注销后账号、创建的组织与成员关系将被删除，且不可恢复。
                </p>
                <Button
                  size="sm"
                  variant="danger"
                  className="button--danger"
                  isDisabled={user?.isSuperAdmin}
                  onPress={() => { setReason(""); setOpen(true); }}
                >
                  <Trash2 className="size-4" /> 申请注销账户
                </Button>
                {user?.isSuperAdmin && <span className="text-muted text-[11px]">超级管理员账号受保护</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={open} onOpenChange={setOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[520px]">
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>申请注销账户</Modal.Heading></Modal.Header>
          <div>
            <Modal.Body>
              <div className="space-y-4">
                <div className="border-danger/25 bg-danger/8 rounded-xl border p-4">
                  <div className="flex gap-3">
                    <TriangleAlert className="text-danger mt-0.5 size-5 shrink-0" />
                    <p className="text-muted text-xs leading-relaxed">
                      提交后账号进入 {DELETION_GRACE_DAYS} 天冷静期：期间仍可登录个人中心并恢复，但无法进入任何组织。
                      超管同意或期满后立即注销，账号及其创建的组织、成员关系、邀请将被删除且不可恢复。
                    </p>
                  </div>
                </div>
                <TextField isRequired className="w-full">
                  <Label>注销原因</Label>
                  <InputGroup>
                    <InputGroup.Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="例如：不再使用 Cyanos 平台"
                    />
                  </InputGroup>
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => setOpen(false)}>取消</Button>
              <Button variant="danger" className="button--danger" isDisabled={!reason.trim()} onPress={submitDeletion}>
                提交注销申请
              </Button>
            </Modal.Footer>
          </div>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>
    </div>
  );
}

function NotificationsTab() {
  const items = [
    { title: "产品更新", desc: "获取新功能和改进的通知", defaultOn: true },
    { title: "评论与提及", desc: "当有人在项目中提及你时通知", defaultOn: true },
    { title: "每周摘要", desc: "每周一接收团队活动汇总邮件", defaultOn: false },
    { title: "安全提醒", desc: "账户异常登录等重要安全事件", defaultOn: true },
  ];
  return (
    <div className="grid max-w-4xl gap-5">
      <div className="neon-card rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <span className="bg-accent/12 text-accent flex size-10 items-center justify-center rounded-lg"><Bell className="size-5" /></span>
          <div><h3 className="text-foreground font-semibold">通知偏好</h3><p className="text-muted text-xs">选择你希望接收的通知类型。</p></div>
        </div>
        <ul className="mt-5 divide-y divide-[var(--separator)]">
          {items.map((item) => (
            <li className="flex items-center justify-between gap-4 py-4" key={item.title}>
              <div><p className="text-foreground text-sm font-medium">{item.title}</p><p className="text-muted text-xs">{item.desc}</p></div>
              <Switch defaultSelected={item.defaultOn}><Switch.Control><Switch.Thumb /></Switch.Control></Switch>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { theme, setTheme } = useThemeMode();
  return (
    <div className="grid max-w-4xl gap-5">
      <div className="neon-card rounded-2xl p-6">
        <h3 className="text-foreground font-semibold">外观主题</h3>
        <p className="text-muted mt-1 text-xs">选择适合你的界面风格。</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {([
            { key: "light", label: "浅色模式", desc: "明亮清爽，适合白天使用。", icon: Sun },
            { key: "dark", label: "深色模式", desc: "柔和护眼，适合夜间使用。", icon: Moon },
          ] as const).map((o) => {
            const Icon = o.icon;
            return (
              <button key={o.key} onClick={() => setTheme(o.key)} className={`rounded-xl border-2 p-4 text-left transition-all ${theme === o.key ? "border-accent bg-accent/5" : "border-separator hover:border-muted"}`}>
                <span className="bg-accent/12 text-accent mb-3 flex size-9 items-center justify-center rounded-lg"><Icon className="size-5" /></span>
                <p className="text-foreground text-sm font-semibold">{o.label}</p>
                <p className="text-muted mt-1 text-xs">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="个人中心" description="管理你的组织、个人资料、安全与偏好。" />
      <OrganizationManager />
      <h2 className="text-foreground mt-7 mb-3 font-semibold">个人设置</h2>
      <Tabs className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label="个人中心选项卡">
            <Tabs.Tab id="profile"><UserRound className="size-4" /> 个人资料 <Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="security"><ShieldCheck className="size-4" /> 账户安全 <Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="notifications"><Bell className="size-4" /> 通知设置 <Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="preferences"><Settings2 className="size-4" /> 偏好设置 <Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="profile" className="pt-5"><ProfileForm /></Tabs.Panel>
        <Tabs.Panel id="security" className="pt-5"><SecurityTab /></Tabs.Panel>
        <Tabs.Panel id="notifications" className="pt-5"><NotificationsTab /></Tabs.Panel>
        <Tabs.Panel id="preferences" className="pt-5"><PreferencesTab /></Tabs.Panel>
      </Tabs>
    </div>
  );
}
