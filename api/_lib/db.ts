import { neon } from "@neondatabase/serverless";
import type { Account, Invitation, Membership, Workspace } from "../../src/lib/types";

/** 从 Vercel 环境变量读取 Neon 连接串 */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 未配置");
  return neon(url);
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

/* ---------- 行 → 前端对象映射（snake_case → camelCase） ---------- */

type Row = Record<string, any>;

export function toAccount(r: Row): Account {
  return {
    id: String(r.id),
    email: r.email ?? "",
    phone: r.phone ?? "",
    name: r.name ?? "",
    passwordHash: r.password_hash ?? "",
    avatarColor: r.avatar_color ?? "",
    bio: r.bio ?? "",
    location: r.location ?? "",
    isSuperAdmin: !!r.is_super_admin,
    status: r.status ?? "active",
    createdAt: r.created_at ? String(r.created_at).slice(0, 10) : "",
    lastActive: r.last_active ?? "刚刚",
    deletionRequestedAt: r.deletion_requested_at ? String(r.deletion_requested_at).slice(0, 10) : null,
    deletionReason: r.deletion_reason ?? "",
    deletionExpiresAt: r.deletion_expires_at ? String(r.deletion_expires_at).slice(0, 10) : null,
  };
}

export function toWorkspace(r: Row): Workspace {
  return {
    id: String(r.id),
    name: r.name ?? "",
    code: r.code ?? "",
    type: r.type ?? "company",
    logo: r.logo ?? "",
    ownerId: r.owner_id ?? "",
    description: r.description ?? "",
    phone: r.phone ?? "",
    address: r.address ?? "",
    status: r.status ?? "active",
    createdAt: r.created_at ? String(r.created_at).slice(0, 10) : "",
    deletionRequestedAt: r.deletion_requested_at ? String(r.deletion_requested_at).slice(0, 10) : null,
    deletionReason: r.deletion_reason ?? "",
    deletionExpiresAt: r.deletion_expires_at ? String(r.deletion_expires_at).slice(0, 10) : null,
    deletionRequestedBy: r.deletion_requested_by ?? null,
  };
}

export function toMembership(r: Row): Membership {
  return {
    id: String(r.id),
    workspaceId: r.workspace_id ?? "",
    accountId: r.account_id ?? "",
    role: r.role ?? "member",
    departmentId: r.department_id ?? null,
    status: r.status ?? "active",
    joinedAt: r.joined_at ? String(r.joined_at).slice(0, 10) : "",
  };
}

export function toInvitation(r: Row): Invitation {
  return {
    id: String(r.id),
    workspaceId: r.workspace_id ?? "",
    email: r.email ?? "",
    role: r.role ?? "member",
    token: r.token ?? "",
    status: r.status ?? "pending",
    invitedBy: r.invited_by ?? "",
    createdAt: r.created_at ? String(r.created_at).slice(0, 10) : "",
  };
}

/**
 * 拉取指定账号可见的数据快照。
 * 普通账号：自己 + 自己所在工作空间及其成员/邀请。
 * 超级管理员：全平台账号/工作空间/成员/邀请。
 */
export async function readSnapshot(sql: ReturnType<typeof getSql>, accountId: string, isSuperAdmin: boolean) {
  let accountRows: Row[];
  let workspaceRows: Row[];
  let membershipRows: Row[];
  let invitationRows: Row[];

  if (isSuperAdmin) {
    [accountRows, workspaceRows, membershipRows, invitationRows] = await Promise.all([
      sql`select * from accounts order by created_at desc`,
      sql`select * from workspaces order by created_at desc`,
      sql`select * from memberships`,
      sql`select * from invitations`,
    ]);
  } else {
    const mine = await sql`select workspace_id from memberships where account_id = ${accountId}`;
    const workspaceIds = mine.map((m: Row) => String(m.workspace_id));

    // 收件人可能尚未加入任何组织：按邮箱/手机号取出"发给我的"邀请，
    // 连同邀请所属组织的基本信息一起返回，供个人中心消息待办展示与接受。
    const me = await sql`select email, phone from accounts where id = ${accountId} limit 1`;
    const keys = [me[0]?.email, me[0]?.phone].map((v: unknown) => (v ? String(v).trim().toLowerCase() : "")).filter(Boolean) as string[];
    const incoming = keys.length
      ? await sql`select * from invitations where lower(email) = any(${keys}::text[])`
      : [];
    const incomingWorkspaceIds = incoming
      .map((i: Row) => String(i.workspace_id))
      .filter((id: string) => !workspaceIds.includes(id));
    const inviterIds = incoming.map((i: Row) => String(i.invited_by)).filter(Boolean);
    const visibleWorkspaceIds = [...workspaceIds, ...incomingWorkspaceIds];

    [accountRows, workspaceRows, membershipRows, invitationRows] = await Promise.all([
      sql`select * from accounts where id = ${accountId} or id in (select account_id from memberships where workspace_id = any(${workspaceIds}::text[])) or id = any(${inviterIds}::text[])`,
      visibleWorkspaceIds.length ? sql`select * from workspaces where id = any(${visibleWorkspaceIds}::text[]) order by created_at desc` : Promise.resolve([]),
      workspaceIds.length ? sql`select * from memberships where workspace_id = any(${workspaceIds}::text[])` : Promise.resolve([]),
      Promise.resolve([
        ...(workspaceIds.length ? await sql`select * from invitations where workspace_id = any(${workspaceIds}::text[])` : []),
        ...incoming,
      ].filter((i: Row, n: number, arr: Row[]) => arr.findIndex((x) => x.id === i.id) === n)),
    ]);
  }

  return {
    accounts: accountRows.map(toAccount),
    workspaces: workspaceRows.map(toWorkspace),
    memberships: membershipRows.map(toMembership),
    invitations: invitationRows.map(toInvitation),
  };
}

/**
 * 15 天冷静期到期自动同意注销（惰性执行）：
 * 每次读取快照或写操作前调用，超管若未及时点「同意注销」，到期后自动落库执行。
 */
export async function processDueDeletions(sql: ReturnType<typeof getSql>) {
  const now = new Date().toISOString().slice(0, 10);
  const dueWorkspaces = await sql`select id from workspaces where deletion_expires_at is not null and deletion_expires_at <= ${now}`;
  for (const row of dueWorkspaces) {
    await sql`delete from workspaces where id = ${String(row.id)}`;
  }

  const dueAccounts = await sql`select id from accounts where deletion_expires_at is not null and deletion_expires_at <= ${now}`;
  for (const row of dueAccounts) {
    const accountId = String(row.id);
    await sql`delete from workspaces where owner_id = ${accountId}`;
    await sql`delete from memberships where account_id = ${accountId}`;
    await sql`delete from invitations where invited_by = ${accountId}`;
    await sql`
      update accounts
      set status = 'disabled', password_hash = '', deletion_requested_at = null,
        deletion_reason = '', deletion_expires_at = null
      where id = ${accountId}
    `;
  }
}

export function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "服务器错误";
  if (message.includes("DATABASE_URL")) return fail(message, 503);
  return fail(message, 500);
}
