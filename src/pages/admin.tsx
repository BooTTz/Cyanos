import { useMemo, useState } from "react";
import { Building2, Clock3, Crown, Search, ShieldAlert, Trash2, TriangleAlert, UserRound, UsersRound } from "lucide-react";
import { Button, Dropdown, Modal, Table, Tabs } from "@heroui/react";

import { PageHeader, UserAvatar } from "@/components/ui";
import { deletionDaysLeft, tenantActions, useTenantStore } from "@/lib/tenant-store";
import { orgTypeLabels } from "@/lib/types";
import { useAuth } from "@/provider";

export default function AdminPage() {
  const { user } = useAuth();
  const store = useTenantStore();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<{ kind: "workspace" | "account"; id: string; name: string } | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const accounts = useMemo(
    () =>
      store.accounts.filter((a) => {
        const q = query.trim().toLowerCase();
        return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.phone.includes(q);
      }),
    [store.accounts, query],
  );

  const stats = useMemo(
    () => ({
      accounts: store.accounts.length,
      active: store.accounts.filter((a) => a.status === "active").length,
      workspaces: store.workspaces.length,
      memberships: store.memberships.length,
      pending: store.workspaces.filter((w) => w.deletionRequestedAt).length + store.accounts.filter((a) => a.status === "pending-deletion").length,
    }),
    [store],
  );

  const removedAccount = store.accounts.find((a) => a.id === target);

  const handleDeactivate = () => {
    if (target) tenantActions.deactivateAccount(target);
    setConfirmOpen(false);
    setTarget(null);
  };

  const handleApprove = () => {
    if (approvalTarget && user) {
      if (approvalTarget.kind === "workspace") tenantActions.approveWorkspaceDeletion(approvalTarget.id, user.id);
      else tenantActions.approveAccountDeletion(approvalTarget.id, user.id);
    }
    setApprovalOpen(false);
    setApprovalTarget(null);
  };

  const workspaceName = (id: string) => store.workspaces.find((w) => w.id === id)?.name ?? "—";
  const accountName = (id: string) => store.accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="系统管理后台"
        description="仅超级管理员可见：查看平台全部账号、组织与成员，并可注销账号。"
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "全部账号", value: stats.accounts, icon: UserRound, color: "var(--brand-purple)" },
          { label: "正常账号", value: stats.active, icon: UsersRound, color: "var(--brand-green-strong)" },
          { label: "组织总数", value: stats.workspaces, icon: Building2, color: "#f59e0b" },
          { label: "成员关系", value: stats.memberships, icon: ShieldAlert, color: "var(--danger)" },
          { label: "待处理注销", value: stats.pending, icon: Clock3, color: "var(--danger)" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div className="neon-card flex items-center gap-3 rounded-xl px-4 py-3.5" key={s.label}>
              <span className="flex size-10 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklch, ${s.color} 14%, transparent)`, color: s.color }}>
                <Icon className="size-5" />
              </span>
              <div><p className="text-muted text-xs">{s.label}</p><p className="text-foreground text-xl font-bold leading-tight">{s.value}</p></div>
            </div>
          );
        })}
      </div>

      <div className="neon-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--separator)] p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              aria-label="搜索账号"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索姓名、邮箱、手机号…"
              className="bg-default border-separator text-foreground placeholder:text-muted focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none transition-colors"
            />
          </div>
          <span className="text-muted ml-auto text-xs">超级管理员视图</span>
        </div>

        <Tabs aria-label="后台数据">
          <Tabs.ListContainer className="px-4 pt-3">
            <Tabs.List aria-label="后台数据分类">
              <Tabs.Tab id="accounts">全部账号 <Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="workspaces">全部组织 <Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="members">成员关系 <Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="accounts" className="p-4">
            <Table variant="secondary">
              <Table.ScrollContainer className="table-scroll max-h-[clamp(360px,52vh,600px)] overflow-y-auto">
                <Table.Content aria-label="全部账号" className="min-w-[760px]">
                  <Table.Header className="bg-[var(--surface-secondary)] sticky top-0 z-10">
                    <Table.Column isRowHeader>账号</Table.Column>
                    <Table.Column>联系方式</Table.Column>
                    <Table.Column>类型</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>注册时间</Table.Column>
                    <Table.Column aria-label="操作" />
                  </Table.Header>
                  <Table.Body>
                    {accounts.map((a) => (
                      <Table.Row key={a.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <UserAvatar name={a.name} color={a.avatarColor} />
                            <div><p className="text-foreground text-sm font-medium">{a.name}</p><p className="text-muted text-xs">{a.id}</p></div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="text-muted text-xs"><p>{a.email || "—"}</p><p>{a.phone || "—"}</p></div>
                        </Table.Cell>
                        <Table.Cell>
                          {a.isSuperAdmin ? (
                            <span className="bg-warning/12 text-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"><Crown className="size-3" /> 超级管理员</span>
                          ) : (
                            <span className="text-muted text-xs">普通账号</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${a.status === "active" ? "bg-success/12 text-success" : "bg-danger/12 text-danger"}`}>
                            {a.status === "active" ? "正常" : a.status === "pending-deletion" ? `注销中 · ${deletionDaysLeft(a.deletionExpiresAt)} 天` : "已注销"}
                          </span>
                        </Table.Cell>
                        <Table.Cell><span className="text-muted text-xs">{a.createdAt}</span></Table.Cell>
                        <Table.Cell>
                          {a.isSuperAdmin ? (
                            <span className="text-muted text-xs">受保护</span>
                          ) : (
                            <Dropdown>
                              <Button isIconOnly size="sm" variant="ghost" aria-label={`操作 ${a.name}`}>
                                <ShieldAlert className="text-muted size-4" />
                              </Button>
                              <Dropdown.Popover placement="bottom end">
                                <Dropdown.Menu aria-label="账号操作">
                                  <Dropdown.Item id="deactivate" variant="danger" onAction={() => { setTarget(a.id); setConfirmOpen(true); }}>
                                    <Trash2 className="size-4" /> 注销账号
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel id="workspaces" className="p-4">
            <Tabs aria-label="组织视图" className="admin-subtabs">
              <Tabs.ListContainer className="border-separator mb-3 border-b">
                <Tabs.List aria-label="组织视图分类">
                  <Tabs.Tab id="all-workspaces">全部组织</Tabs.Tab>
                  <Tabs.Tab id="deletion-requests">注销申请</Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>

              <Tabs.Panel id="all-workspaces">
                <Table variant="secondary">
                  <Table.ScrollContainer className="table-scroll max-h-[clamp(360px,52vh,600px)] overflow-y-auto">
                    <Table.Content aria-label="全部组织" className="min-w-[680px]">
                      <Table.Header className="bg-[var(--surface-secondary)] sticky top-0 z-10">
                        <Table.Column isRowHeader>组织</Table.Column>
                        <Table.Column>编码</Table.Column>
                        <Table.Column>类型</Table.Column>
                        <Table.Column>创建者</Table.Column>
                        <Table.Column>创建时间</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {store.workspaces.map((w) => (
                          <Table.Row key={w.id}>
                            <Table.Cell><span className="text-foreground text-sm font-medium">{w.name}</span></Table.Cell>
                            <Table.Cell><span className="text-muted text-xs">{w.code}</span></Table.Cell>
                            <Table.Cell><span className="text-muted text-xs">{orgTypeLabels[w.type]}</span></Table.Cell>
                            <Table.Cell><span className="text-muted text-xs">{accountName(w.ownerId)}</span></Table.Cell>
                            <Table.Cell><span className="text-muted text-xs">{w.createdAt}</span></Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </Tabs.Panel>

              <Tabs.Panel id="deletion-requests">
                <div className="space-y-6">
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-foreground text-sm font-semibold">组织注销申请</h3>
                      <span className="bg-danger/12 text-danger rounded-full px-2 py-0.5 text-[10px]">
                        {store.workspaces.filter((w) => w.deletionRequestedAt).length}
                      </span>
                    </div>
                    <Table variant="secondary">
                      <Table.ScrollContainer className="table-scroll max-h-[320px] overflow-y-auto">
                        <Table.Content aria-label="组织注销申请" className="min-w-[760px]">
                          <Table.Header className="bg-[var(--surface-secondary)] sticky top-0 z-10">
                            <Table.Column isRowHeader>组织</Table.Column>
                            <Table.Column>创建者</Table.Column>
                            <Table.Column>注销原因</Table.Column>
                            <Table.Column>申请日</Table.Column>
                            <Table.Column>剩余冷静期</Table.Column>
                            <Table.Column aria-label="操作" />
                          </Table.Header>
                          <Table.Body>
                            {store.workspaces.filter((w) => w.deletionRequestedAt).map((w) => (
                              <Table.Row key={w.id}>
                                <Table.Cell><span className="text-foreground text-sm font-medium">{w.name}</span></Table.Cell>
                                <Table.Cell><span className="text-muted text-xs">{accountName(w.deletionRequestedBy || w.ownerId)}</span></Table.Cell>
                                <Table.Cell><span className="text-muted text-xs">{w.deletionReason || "—"}</span></Table.Cell>
                                <Table.Cell><span className="text-muted text-xs">{w.deletionRequestedAt}</span></Table.Cell>
                                <Table.Cell>
                                  <span className="bg-danger/12 text-danger inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                                    <Clock3 className="size-3" /> {deletionDaysLeft(w.deletionExpiresAt)} 天
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    className="button--danger"
                                    onPress={() => { setApprovalTarget({ kind: "workspace", id: w.id, name: w.name }); setApprovalOpen(true); }}
                                  >
                                    同意注销
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                            {store.workspaces.filter((w) => w.deletionRequestedAt).length === 0 && (
                              <Table.Row><Table.Cell colSpan={6}><p className="text-muted py-6 text-center text-xs">暂无组织注销申请</p></Table.Cell></Table.Row>
                            )}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-foreground text-sm font-semibold">账户注销申请</h3>
                      <span className="bg-danger/12 text-danger rounded-full px-2 py-0.5 text-[10px]">
                        {store.accounts.filter((a) => a.status === "pending-deletion").length}
                      </span>
                    </div>
                    <Table variant="secondary">
                      <Table.ScrollContainer className="table-scroll max-h-[320px] overflow-y-auto">
                        <Table.Content aria-label="账户注销申请" className="min-w-[700px]">
                          <Table.Header className="bg-[var(--surface-secondary)] sticky top-0 z-10">
                            <Table.Column isRowHeader>账号</Table.Column>
                            <Table.Column>注销原因</Table.Column>
                            <Table.Column>申请日</Table.Column>
                            <Table.Column>剩余冷静期</Table.Column>
                            <Table.Column aria-label="操作" />
                          </Table.Header>
                          <Table.Body>
                            {store.accounts.filter((a) => a.status === "pending-deletion").map((a) => (
                              <Table.Row key={a.id}>
                                <Table.Cell><span className="text-foreground text-sm font-medium">{a.name}</span><span className="text-muted block text-xs">{a.email || a.phone}</span></Table.Cell>
                                <Table.Cell><span className="text-muted text-xs">{a.deletionReason || "—"}</span></Table.Cell>
                                <Table.Cell><span className="text-muted text-xs">{a.deletionRequestedAt}</span></Table.Cell>
                                <Table.Cell>
                                  <span className="bg-danger/12 text-danger inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                                    <Clock3 className="size-3" /> {deletionDaysLeft(a.deletionExpiresAt)} 天
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    className="button--danger"
                                    onPress={() => { setApprovalTarget({ kind: "account", id: a.id, name: a.name }); setApprovalOpen(true); }}
                                  >
                                    同意注销
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                            {store.accounts.filter((a) => a.status === "pending-deletion").length === 0 && (
                              <Table.Row><Table.Cell colSpan={5}><p className="text-muted py-6 text-center text-xs">暂无账户注销申请</p></Table.Cell></Table.Row>
                            )}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </section>
                </div>
              </Tabs.Panel>
            </Tabs>
          </Tabs.Panel>

          <Tabs.Panel id="members" className="p-4">
            <Table variant="secondary">
              <Table.ScrollContainer className="table-scroll max-h-[clamp(360px,52vh,600px)] overflow-y-auto">
                <Table.Content aria-label="成员关系" className="min-w-[680px]">
                  <Table.Header className="bg-[var(--surface-secondary)] sticky top-0 z-10">
                    <Table.Column isRowHeader>账号</Table.Column>
                    <Table.Column>所属组织</Table.Column>
                    <Table.Column>角色</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>加入时间</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {store.memberships.map((m) => (
                      <Table.Row key={m.id}>
                        <Table.Cell><span className="text-foreground text-sm">{accountName(m.accountId)}</span></Table.Cell>
                        <Table.Cell><span className="text-muted text-xs">{workspaceName(m.workspaceId)}</span></Table.Cell>
                        <Table.Cell><span className="text-muted text-xs">{m.role === "owner" ? "创建者" : m.role === "admin" ? "管理员" : "成员"}</span></Table.Cell>
                        <Table.Cell><span className="text-muted text-xs">{m.status === "active" ? "正常" : "已邀请"}</span></Table.Cell>
                        <Table.Cell><span className="text-muted text-xs">{m.joinedAt}</span></Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </Tabs.Panel>

        </Tabs>
      </div>

      <Modal isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[440px]">
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>确认注销账号？</Modal.Heading></Modal.Header>
          <Modal.Body>
            <p className="text-muted text-sm leading-relaxed">
              即将注销 <span className="text-foreground font-semibold">{removedAccount?.name}</span>（{removedAccount?.email || removedAccount?.phone}）。
              该操作会删除其创建的组织、全部成员关系与邀请，账号将恢复为未注册状态且无法登录。此操作不可撤销。
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setConfirmOpen(false)}>取消</Button>
            <Button variant="danger" onPress={handleDeactivate}>确认注销</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      <Modal isOpen={approvalOpen} onOpenChange={setApprovalOpen}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog className="sm:max-w-[460px]">
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>同意注销？</Modal.Heading></Modal.Header>
          <Modal.Body>
            <div className="border-danger/25 bg-danger/8 rounded-xl border p-4">
              <div className="flex gap-3">
                <TriangleAlert className="text-danger mt-0.5 size-5 shrink-0" />
                <p className="text-muted text-xs leading-relaxed">
                  同意后立即注销 <span className="text-foreground font-semibold">{approvalTarget?.name}</span>
                  {approvalTarget?.kind === "workspace" ? " 及其全部成员关系、邀请和组织数据" : " 及其创建的组织、成员关系与账号"}.
                  该操作不可撤销，申请人无需再等待剩余冷静期。
                </p>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={() => setApprovalOpen(false)}>取消</Button>
            <Button variant="danger" className="button--danger" onPress={handleApprove}>同意注销</Button>
          </Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>
    </div>
  );
}
