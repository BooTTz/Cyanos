import { useEffect, useMemo, useState } from "react";

import {
  avatarPalette,
  DELETION_GRACE_DAYS,
  type Account,
  type Invitation,
  type Membership,
  type OrgType,
  type Workspace,
  type WorkspaceRole,
} from "./types";

/**
 * 多租户数据层（双模式）：
 * - 本地开发：localStorage 持久化 + 模块级事件同步，可离线预览全部功能。
 * - 部署到 Vercel：检测到 VITE_API_BASE 后自动切换到 /api 真后端（Neon Postgres），
 *   页面与组件只依赖本文件暴露的 hooks / actions，无需改动。
 *
 * 真后端模式下：读操作先返回本地镜像保证即时响应，同时向 /api/state 拉取权威快照；
 * 写操作走 /api/mutations，成功后以服务端返回的快照为准刷新。
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "";
const USE_API = API_BASE.length > 0;

const DB_KEY = "cyanos-tenant-db-v1";
const SESSION_KEY = "cyanos-session-v1";
const TOKEN_KEY = "cyanos-token-v1";
const LAST_WORKSPACE_KEY = "cyanos-last-workspace-v1";
const CHANGE_EVENT = "cyanos:tenant-changed";
const SESSION_EVENT = "cyanos:session-changed";

export interface TenantDB {
  accounts: Account[];
  workspaces: Workspace[];
  memberships: Membership[];
  invitations: Invitation[];
}

export interface Session {
  accountId: string;
  workspaceId: string | null;
}

export interface VerificationTicket {
  target: string;
  code: string;
  expiresAt: number;
}

let lastVerification: VerificationTicket | null = null;

const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}${Date.now().toString(36).toUpperCase().slice(-7)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** 注销冷静期剩余天数（到期返回 0），供卡片与后台倒计时共用 */
export function deletionDaysLeft(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0;
  const end = Date.parse(`${expiresAt}T00:00:00Z`);
  return Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
}

/** 本地演示用轻量哈希（真后端由服务端 scrypt 处理，前端不参与密码存储） */
export function hashPassword(password: string): string {
  let h = 5381;
  const salted = `cyanos::${password}`;
  for (let i = 0; i < salted.length; i += 1) h = (h * 33) ^ salted.charCodeAt(i);
  return `h${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function seed(): TenantDB {
  const owner: Account = {
    id: "ACC-OWNER",
    email: "wechat@cyanos.cn",
    phone: "13800000000",
    name: "林知夏",
    passwordHash: hashPassword("CyanOS1120"),
    avatarColor: avatarPalette[0],
    bio: "Cyanos 示例组织的创建者与管理负责人。",
    location: "中国 · 上海",
    isSuperAdmin: false,
    status: "active",
    createdAt: "2024-03-18",
    lastActive: "刚刚",
    deletionRequestedAt: null,
    deletionReason: "",
    deletionExpiresAt: null,
  };
  const superAdmin: Account = {
    id: "ACC-SUPER",
    email: "CyanAdmin",
    phone: "",
    name: "超级管理员",
    passwordHash: hashPassword("CyanOS1120"),
    avatarColor: avatarPalette[2],
    bio: "平台超级管理员，可访问系统管理后台。",
    location: "中国 · 上海",
    isSuperAdmin: true,
    status: "active",
    createdAt: "2024-01-01",
    lastActive: "刚刚",
    deletionRequestedAt: null,
    deletionReason: "",
    deletionExpiresAt: null,
  };
  const workspace: Workspace = {
    id: "WS-DEFAULT",
    name: "华远智造科技有限公司",
    code: "HY-ZZ",
    type: "company",
    logo: "",
    ownerId: owner.id,
    description: "集团总部，统筹生产运营、安全管理与供应链协同。",
    phone: "021-6688 1000",
    address: "上海市浦东新区张江路 88 号",
    status: "active",
    createdAt: "2024-03-18",
    deletionRequestedAt: null,
    deletionReason: "",
    deletionExpiresAt: null,
    deletionRequestedBy: null,
  };
  const ownerMembership: Membership = {
    id: "MEM-OWNER",
    workspaceId: workspace.id,
    accountId: owner.id,
    role: "owner",
    departmentId: "O1000",
    status: "active",
    joinedAt: "2024-03-18",
  };
  const superMembership: Membership = {
    id: "MEM-SUPER",
    workspaceId: workspace.id,
    accountId: superAdmin.id,
    role: "admin",
    departmentId: null,
    status: "active",
    joinedAt: "2024-01-01",
  };
  return {
    accounts: [owner, superAdmin],
    workspaces: [workspace],
    memberships: [ownerMembership, superMembership],
    invitations: [],
  };
}

function emptyDB(): TenantDB {
  return { accounts: [], workspaces: [], memberships: [], invitations: [] };
}

/** 兼容旧版本本地数据：补齐注销申请字段，避免读取 undefined */
function normalizeDB(parsed: TenantDB): TenantDB {
  return {
    ...parsed,
    accounts: (parsed.accounts ?? []).map((a) => ({
      ...a,
      deletionRequestedAt: a.deletionRequestedAt ?? null,
      deletionReason: a.deletionReason ?? "",
      deletionExpiresAt: a.deletionExpiresAt ?? null,
    })),
    workspaces: (parsed.workspaces ?? []).map((w) => ({
      ...w,
      deletionRequestedAt: w.deletionRequestedAt ?? null,
      deletionReason: w.deletionReason ?? "",
      deletionExpiresAt: w.deletionExpiresAt ?? null,
      deletionRequestedBy: w.deletionRequestedBy ?? null,
    })),
    memberships: parsed.memberships ?? [],
    invitations: parsed.invitations ?? [],
  };
}

function readDB(): TenantDB {
  // 真后端模式：先用本地镜像即时渲染，随后由 bootstrap 拉取权威数据覆盖
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TenantDB;
      if (Array.isArray(parsed.accounts) && Array.isArray(parsed.workspaces)) return normalizeDB(parsed);
    }
  } catch {
    // ignore
  }
  return USE_API ? emptyDB() : seed();
}

let db: TenantDB | null = null;
const listeners = new Set<() => void>();

/** 15 天到期自动同意注销：所有本地读取都会惰性执行一次 */
function applyDueDeletions(current: TenantDB): TenantDB {
  const now = today();
  const dueWorkspaces = new Set(current.workspaces.filter((w) => w.deletionExpiresAt && w.deletionExpiresAt <= now).map((w) => w.id));
  const dueAccounts = new Set(current.accounts.filter((a) => a.deletionExpiresAt && a.deletionExpiresAt <= now).map((a) => a.id));
  if (!dueWorkspaces.size && !dueAccounts.size) return current;

  const ownedWorkspaces = new Set(current.workspaces.filter((w) => dueAccounts.has(w.ownerId)).map((w) => w.id));
  return {
    accounts: current.accounts.map((a) =>
      dueAccounts.has(a.id)
        ? { ...a, status: "disabled" as const, passwordHash: "", deletionRequestedAt: null, deletionReason: "", deletionExpiresAt: null }
        : a,
    ),
    workspaces: current.workspaces.filter((w) => !dueWorkspaces.has(w.id) && !ownedWorkspaces.has(w.id)),
    memberships: current.memberships.filter((m) => !dueWorkspaces.has(m.workspaceId) && !ownedWorkspaces.has(m.workspaceId) && !dueAccounts.has(m.accountId)),
    invitations: current.invitations.filter((i) => !dueWorkspaces.has(i.workspaceId) && !ownedWorkspaces.has(i.workspaceId) && !dueAccounts.has(i.invitedBy)),
  };
}

function getDB(): TenantDB {
  if (!db) db = readDB();
  const next = applyDueDeletions(db);
  if (next !== db) commit(next);
  return db;
}

function commit(next: TenantDB) {
  db = next;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式下仅本次会话有效
  }
  notify();
}

function notify() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as Session;
  } catch {
    // ignore
  }
  return null;
}

let session: Session | null | undefined;
const sessionListeners = new Set<() => void>();

function getSession(): Session | null {
  if (session === undefined) session = readSession();
  return session ?? null;
}

function commitSession(next: Session | null) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  sessionListeners.forEach((l) => l());
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EVENT));
}

function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}
function setToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/* ---------------- 真后端通信 ---------------- */

async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `请求失败 (${res.status})`);
  return payload as T;
}

/** 应用启动时调用：真后端模式下从服务端拉取权威数据快照 */
export async function bootstrap(): Promise<void> {
  if (!USE_API || !getToken()) return;
  try {
    const data = await apiFetch<{ db: TenantDB }>("/state");
    commit(normalizeDB(data.db));
  } catch {
    // token 失效时静默降级为本地空数据，用户可重新登录
  }
}

/** 写操作统一入口：真后端模式发到 mutations，成功则用服务端快照刷新 */
async function mutate(action: string, payload: Record<string, unknown>): Promise<void> {
  if (!USE_API) return;
  const data = await apiFetch<{ db?: TenantDB }>("/mutations", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
  if (data.db) commit(normalizeDB(data.db));
}

/** 订阅租户数据变更 */
export function useTenantStore(): TenantDB {
  const [snapshot, setSnapshot] = useState<TenantDB>(() => getDB());
  useEffect(() => {
    const refresh = () => setSnapshot({ ...getDB() });
    listeners.add(refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      listeners.delete(refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);
  return snapshot;
}

/** 订阅会话变更 */
export function useSession(): Session | null {
  const [snapshot, setSnapshot] = useState<Session | null>(() => getSession());
  useEffect(() => {
    const refresh = () => setSnapshot(getSession() ? { ...getSession()! } : null);
    sessionListeners.add(refresh);
    window.addEventListener(SESSION_EVENT, refresh);
    return () => {
      sessionListeners.delete(refresh);
      window.removeEventListener(SESSION_EVENT, refresh);
    };
  }, []);
  return snapshot;
}

/** 验证码：本地演示直接返回；真后端由 /api/auth?action=send-code 生成（演示模式仍展示在页面） */
export const verification = {
  async send(target: string): Promise<string> {
    if (USE_API) {
      try {
        const data = await apiFetch<{ code: string }>("/auth?action=send-code", {
          method: "POST",
          body: JSON.stringify({ target }),
        });
        lastVerification = { target, code: data.code, expiresAt: Date.now() + 5 * 60 * 1000 };
        return data.code;
      } catch {
        // 后端不可用时回退本地生成，保证交互不中断
      }
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    lastVerification = { target, code, expiresAt: Date.now() + 5 * 60 * 1000 };
    return code;
  },
  verify(target: string, code: string): boolean {
    if (!lastVerification) return false;
    return lastVerification.target === target && lastVerification.code === code && lastVerification.expiresAt > Date.now();
  },
  latest(): VerificationTicket | null {
    return lastVerification;
  },
};

export const tenantActions = {
  /** 注册账号并创建会话。返回错误字符串或 null */
  async register(input: { name: string; email: string; phone: string; password: string; code?: string }): Promise<string | null> {
    if (USE_API) {
      try {
        const data = await apiFetch<{ account: Account; token: string; db: TenantDB }>("/auth?action=register", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setToken(data.token);
        commit(normalizeDB(data.db));
        commitSession({ accountId: data.account.id, workspaceId: null });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "注册失败";
      }
    }
    const current = getDB();
    const identifier = input.email.trim().toLowerCase();
    if (!identifier && !input.phone.trim()) return "请填写邮箱或手机号";
    if (current.accounts.some((a) => a.email.toLowerCase() === identifier || (input.phone && a.phone === input.phone))) {
      return "该邮箱或手机号已注册";
    }
    const account: Account = {
      id: uid("ACC-"),
      email: identifier,
      phone: input.phone.trim(),
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      avatarColor: avatarPalette[current.accounts.length % avatarPalette.length],
      bio: "",
      location: "",
      isSuperAdmin: false,
      status: "active",
      createdAt: today(),
      lastActive: "刚刚",
      deletionRequestedAt: null,
      deletionReason: "",
      deletionExpiresAt: null,
    };
    commit({ ...current, accounts: [...current.accounts, account] });
    commitSession({ accountId: account.id, workspaceId: null });
    return null;
  },

  /** 账号密码登录，支持邮箱或手机号 */
  async login(identifier: string, password: string): Promise<string | null> {
    if (USE_API) {
      try {
        const data = await apiFetch<{ account: Account; token: string; db: TenantDB }>("/auth?action=login", {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        });
        setToken(data.token);
        commit(normalizeDB(data.db));
        const pendingDeletion = data.account.status === "pending-deletion";
        const membership = pendingDeletion
          ? undefined
          : data.db.memberships.find((m) => m.accountId === data.account.id && m.status === "active");
        commitSession({ accountId: data.account.id, workspaceId: membership?.workspaceId ?? null });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "登录失败";
      }
    }
    const current = getDB();
    const key = identifier.trim().toLowerCase();
    const account = current.accounts.find((a) => a.email.toLowerCase() === key || (a.phone && a.phone === identifier.trim()));
    if (!account) return "账号不存在，请先注册";
    if (account.status === "disabled") return "该账号已被注销，请联系管理员";
    if (account.passwordHash !== hashPassword(password)) return "密码错误";
    const membership = account.status === "pending-deletion"
      ? undefined
      : current.memberships.find((m) => m.accountId === account.id && m.status === "active");
    commitSession({ accountId: account.id, workspaceId: membership?.workspaceId ?? null });
    return null;
  },

  logout() {
    if (USE_API) {
      void apiFetch("/auth?action=logout", { method: "POST" }).catch(() => {});
      setToken("");
    }
    commitSession(null);
  },

  /** 当前账号资料更新 */
  updateAccount(id: string, patch: Partial<Account>) {
    const current = getDB();
    commit({ ...current, accounts: current.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
    void mutate("updateAccount", { id, patch }).catch(() => {});
  },

  /** 切换当前工作空间；非 null 时记住"上次进入的组织"，供个人中心默认选中 */
  switchWorkspace(workspaceId: string | null) {
    const s = getSession();
    if (!s) return;
    commitSession({ ...s, workspaceId });
    if (workspaceId) {
      try {
        localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
      } catch {
        // ignore
      }
    }
    void mutate("switchWorkspace", { workspaceId }).catch(() => {});
  },

  /** 接受组织邀请：校验收件人身份，建立成员关系并切换到该组织 */
  acceptInvitation(invitationId: string, accountId: string): string | null {
    const current = getDB();
    const invitation = current.invitations.find((i) => i.id === invitationId && i.status === "pending");
    if (!invitation) return "邀请不存在或已处理";
    const account = current.accounts.find((a) => a.id === accountId);
    if (!account) return "当前账号不存在";
    const keys = [account.email, account.phone].map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (!keys.includes(invitation.email.trim().toLowerCase())) return "该邀请不属于当前账号";

    const membership: Membership = {
      id: uid("MEM-"),
      workspaceId: invitation.workspaceId,
      accountId,
      role: invitation.role === "owner" ? "member" : invitation.role,
      departmentId: null,
      status: "active",
      joinedAt: today(),
    };
    commit({
      ...current,
      memberships: [...current.memberships.filter((m) => !(m.workspaceId === invitation.workspaceId && m.accountId === accountId)), membership],
      invitations: current.invitations.map((i) => (i.id === invitationId ? { ...i, status: "accepted" as const } : i)),
    });
    tenantActions.switchWorkspace(invitation.workspaceId);
    void mutate("acceptInvitation", { invitationId, accountId }).catch(() => {});
    return null;
  },

  /** 拒绝组织邀请 */
  declineInvitation(invitationId: string, accountId: string): string | null {
    const current = getDB();
    const invitation = current.invitations.find((i) => i.id === invitationId && i.status === "pending");
    if (!invitation) return "邀请不存在或已处理";
    const account = current.accounts.find((a) => a.id === accountId);
    if (!account) return "当前账号不存在";
    const keys = [account.email, account.phone].map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (!keys.includes(invitation.email.trim().toLowerCase())) return "该邀请不属于当前账号";
    commit({
      ...current,
      invitations: current.invitations.map((i) => (i.id === invitationId ? { ...i, status: "expired" as const } : i)),
    });
    void mutate("declineInvitation", { invitationId, accountId }).catch(() => {});
    return null;
  },

  /** 退出组织：创建者不可退出，退出后可被再次邀请 */
  leaveWorkspace(workspaceId: string, accountId: string): string | null {
    const current = getDB();
    const membership = current.memberships.find((m) => m.workspaceId === workspaceId && m.accountId === accountId && m.status === "active");
    if (!membership) return "你不在该组织中";
    if (membership.role === "owner") return "创建者不能退出自己创建的组织";
    commit({ ...current, memberships: current.memberships.filter((m) => m.id !== membership.id) });
    const remaining = current.memberships.find((m) => m.accountId === accountId && m.status === "active" && m.id !== membership.id);
    const s = getSession();
    if (s?.workspaceId === workspaceId) commitSession({ ...s, workspaceId: remaining?.workspaceId ?? null });
    void mutate("leaveWorkspace", { workspaceId, accountId }).catch(() => {});
    return null;
  },

  /** 创建工作空间：创建者自动成为 owner */
  createWorkspace(
    input: { name: string; code: string; type: OrgType; description: string; phone: string; address: string; logo?: string },
    accountId: string,
  ): Workspace {
    const current = getDB();
    const workspace: Workspace = {
      id: uid("WS-"),
      name: input.name.trim(),
      code: input.code.trim() || uid("CODE-"),
      type: input.type,
      logo: input.logo ?? "",
      ownerId: accountId,
      description: input.description,
      phone: input.phone,
      address: input.address,
      status: "active",
      createdAt: today(),
      deletionRequestedAt: null,
      deletionReason: "",
      deletionExpiresAt: null,
      deletionRequestedBy: null,
    };
    const membership: Membership = {
      id: uid("MEM-"),
      workspaceId: workspace.id,
      accountId,
      role: "owner",
      departmentId: null,
      status: "active",
      joinedAt: today(),
    };
    commit({
      ...current,
      workspaces: [...current.workspaces, workspace],
      memberships: [...current.memberships, membership],
    });
    tenantActions.switchWorkspace(workspace.id);
    void mutate("createWorkspace", { workspace, membership }).catch(() => {});
    return workspace;
  },

  /** 加入工作空间：接受邀请或凭邀请码 */
  joinWorkspace(workspaceId: string, accountId: string): string | null {
    const current = getDB();
    if (current.memberships.some((m) => m.workspaceId === workspaceId && m.accountId === accountId)) {
      return "你已在该组织中";
    }
    const membership: Membership = {
      id: uid("MEM-"),
      workspaceId,
      accountId,
      role: "member",
      departmentId: null,
      status: "active",
      joinedAt: today(),
    };
    commit({ ...current, memberships: [...current.memberships, membership] });
    commitSession({ accountId, workspaceId });
    void mutate("joinWorkspace", { membership }).catch(() => {});
    return null;
  },

  /**
   * 邀请账号加入工作空间：一律生成 pending 邀请，需对方在消息待办中接受后才成为成员。
   * 已退出的账号（旧邀请为 accepted/declined）可被重新邀请，会重置旧邀请为 pending。
   */
  invite(input: { workspaceId: string; email: string; role: WorkspaceRole; invitedBy: string }): { error: string | null; invited: boolean } {
    const current = getDB();
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@") && !/^\d{6,}$/.test(email)) return { error: "请输入有效邮箱或手机号", invited: false };
    const account = current.accounts.find((a) => a.email.toLowerCase() === email || a.phone === email);
    if (account && current.memberships.some((m) => m.workspaceId === input.workspaceId && m.accountId === account.id && m.status === "active")) {
      return { error: "该账号已在组织中", invited: false };
    }

    const existing = current.invitations.find((i) => i.workspaceId === input.workspaceId && i.email === email);
    if (existing?.status === "pending") return { error: "该邮箱已有待处理的邀请", invited: false };

    // 复用历史邀请记录（退出/拒绝后重邀），避免同一账号产生多条邀请
    const invitation: Invitation = existing
      ? { ...existing, role: input.role, token: uid("TOK-"), status: "pending", invitedBy: input.invitedBy, createdAt: today() }
      : { id: uid("INV-"), workspaceId: input.workspaceId, email, role: input.role, token: uid("TOK-"), status: "pending", invitedBy: input.invitedBy, createdAt: today() };
    commit({
      ...current,
      invitations: existing
        ? current.invitations.map((i) => (i.id === existing.id ? invitation : i))
        : [...current.invitations, invitation],
    });
    void mutate("invite", { invitation }).catch(() => {});
    return { error: null, invited: true };
  },

  /** 更新成员角色/部门/状态 */
  updateMembership(id: string, patch: Partial<Membership>) {
    const current = getDB();
    commit({ ...current, memberships: current.memberships.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
    void mutate("updateMembership", { id, patch }).catch(() => {});
  },

  /** 从组织移除成员 */
  removeMembership(id: string) {
    const current = getDB();
    commit({ ...current, memberships: current.memberships.filter((m) => m.id !== id) });
    void mutate("removeMembership", { id }).catch(() => {});
  },

  /** 超级管理员：注销账号并删除其全部数据 */
  deactivateAccount(accountId: string) {
    const current = getDB();
    const ownedWorkspaces = current.workspaces.filter((w) => w.ownerId === accountId).map((w) => w.id);
    commit({
      accounts: current.accounts.map((a) =>
        a.id === accountId
          ? {
              ...a,
              status: "disabled" as const,
              passwordHash: "",
              deletionRequestedAt: null,
              deletionReason: "",
              deletionExpiresAt: null,
            }
          : a,
      ),
      workspaces: current.workspaces.filter((w) => !ownedWorkspaces.includes(w.id)),
      memberships: current.memberships.filter((m) => m.accountId !== accountId && !ownedWorkspaces.includes(m.workspaceId)),
      invitations: current.invitations.filter((i) => i.invitedBy !== accountId && !ownedWorkspaces.includes(i.workspaceId)),
    });
    void mutate("deactivateAccount", { accountId }).catch(() => {});
  },

  /** 创建者申请注销组织：进入 15 天冷静期，成员可见但不可进入 */
  requestWorkspaceDeletion(workspaceId: string, accountId: string, reason: string): string | null {
    const current = getDB();
    const workspace = current.workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return "组织不存在";
    const membership = current.memberships.find((m) => m.workspaceId === workspaceId && m.accountId === accountId && m.status === "active");
    if (!membership || membership.role !== "owner") return "仅组织创建者可申请注销";
    if (workspace.deletionRequestedAt) return "该组织已在注销流程中";
    const cleanReason = reason.trim();
    if (!cleanReason) return "请填写注销原因";
    const requestedAt = today();
    commit({
      ...current,
      workspaces: current.workspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              deletionRequestedAt: requestedAt,
              deletionReason: cleanReason,
              deletionExpiresAt: addDays(requestedAt, DELETION_GRACE_DAYS),
              deletionRequestedBy: accountId,
            }
          : w,
      ),
    });
    const s = getSession();
    if (s?.workspaceId === workspaceId) commitSession({ ...s, workspaceId: null });
    void mutate("requestWorkspaceDeletion", { workspaceId, accountId, reason: cleanReason }).catch(() => {});
    return null;
  },

  /** 创建者在冷静期内恢复组织 */
  cancelWorkspaceDeletion(workspaceId: string, accountId: string): string | null {
    const current = getDB();
    const workspace = current.workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return "组织不存在";
    if (workspace.ownerId !== accountId) return "仅组织创建者可恢复";
    if (!workspace.deletionRequestedAt) return "该组织未处于注销流程";
    commit({
      ...current,
      workspaces: current.workspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, deletionRequestedAt: null, deletionReason: "", deletionExpiresAt: null, deletionRequestedBy: null }
          : w,
      ),
    });
    void mutate("cancelWorkspaceDeletion", { workspaceId, accountId }).catch(() => {});
    return null;
  },

  /** 超管同意注销组织：立即删除组织及成员、邀请、组织树 */
  approveWorkspaceDeletion(workspaceId: string, operatorId: string): string | null {
    const current = getDB();
    const operator = current.accounts.find((a) => a.id === operatorId);
    if (!operator?.isSuperAdmin) return "仅超级管理员可同意注销";
    commit({
      accounts: current.accounts,
      workspaces: current.workspaces.filter((w) => w.id !== workspaceId),
      memberships: current.memberships.filter((m) => m.workspaceId !== workspaceId),
      invitations: current.invitations.filter((i) => i.workspaceId !== workspaceId),
    });
    void mutate("approveWorkspaceDeletion", { workspaceId, operatorId }).catch(() => {});
    return null;
  },

  /** 账号申请注销：15 天冷静期内可恢复，期间只能停留在个人中心 */
  requestAccountDeletion(accountId: string, reason: string): string | null {
    const current = getDB();
    const account = current.accounts.find((a) => a.id === accountId);
    if (!account) return "当前账号不存在";
    if (account.isSuperAdmin) return "超级管理员账号不可申请注销";
    if (account.status !== "active") return "当前账号不可申请注销";
    const cleanReason = reason.trim();
    if (!cleanReason) return "请填写注销原因";
    const requestedAt = today();
    commit({
      ...current,
      accounts: current.accounts.map((a) =>
        a.id === accountId
          ? {
              ...a,
              status: "pending-deletion" as const,
              deletionRequestedAt: requestedAt,
              deletionReason: cleanReason,
              deletionExpiresAt: addDays(requestedAt, DELETION_GRACE_DAYS),
            }
          : a,
      ),
    });
    const s = getSession();
    if (s) commitSession({ ...s, workspaceId: null });
    void mutate("requestAccountDeletion", { accountId, reason: cleanReason }).catch(() => {});
    return null;
  },

  /** 账号在冷静期内恢复 */
  cancelAccountDeletion(accountId: string): string | null {
    const current = getDB();
    const account = current.accounts.find((a) => a.id === accountId);
    if (!account) return "当前账号不存在";
    if (account.status !== "pending-deletion") return "当前账号未处于注销流程";
    commit({
      ...current,
      accounts: current.accounts.map((a) =>
        a.id === accountId
          ? { ...a, status: "active" as const, deletionRequestedAt: null, deletionReason: "", deletionExpiresAt: null }
          : a,
      ),
    });
    void mutate("cancelAccountDeletion", { accountId }).catch(() => {});
    return null;
  },

  /** 超管同意注销账号：立即禁用账号并清理其组织与成员关系 */
  approveAccountDeletion(accountId: string, operatorId: string): string | null {
    const current = getDB();
    const operator = current.accounts.find((a) => a.id === operatorId);
    if (!operator?.isSuperAdmin) return "仅超级管理员可同意注销";
    const ownedWorkspaces = current.workspaces.filter((w) => w.ownerId === accountId).map((w) => w.id);
    commit({
      accounts: current.accounts.map((a) =>
        a.id === accountId
          ? {
              ...a,
              status: "disabled" as const,
              passwordHash: "",
              deletionRequestedAt: null,
              deletionReason: "",
              deletionExpiresAt: null,
            }
          : a,
      ),
      workspaces: current.workspaces.filter((w) => !ownedWorkspaces.includes(w.id)),
      memberships: current.memberships.filter((m) => m.accountId !== accountId && !ownedWorkspaces.includes(m.workspaceId)),
      invitations: current.invitations.filter((i) => i.invitedBy !== accountId && !ownedWorkspaces.includes(i.workspaceId)),
    });
    void mutate("approveAccountDeletion", { accountId, operatorId }).catch(() => {});
    return null;
  },

  resetDemo() {
    commit(seed());
    commitSession(null);
  },
};

/** 上次进入的组织 ID：个人中心多卡片时默认选它，注销冻结会话后仍能记住 */
export function getLastWorkspaceId(): string | null {
  try {
    return localStorage.getItem(LAST_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

/** 派生查询 hooks */
export function useAccount(id: string | null): Account | null {
  const store = useTenantStore();
  return useMemo(() => store.accounts.find((a) => a.id === id) ?? null, [store.accounts, id]);
}

export function useAccountWorkspaces(accountId: string | null): Array<{ workspace: Workspace; membership: Membership }> {
  const store = useTenantStore();
  return useMemo(
    () =>
      store.memberships
        .filter((m) => m.accountId === accountId && m.status === "active")
        .map((m) => ({ workspace: store.workspaces.find((w) => w.id === m.workspaceId), membership: m }))
        .filter((x): x is { workspace: Workspace; membership: Membership } => !!x.workspace),
    [store, accountId],
  );
}

export function useWorkspaceMembers(workspaceId: string | null): Array<{ account: Account; membership: Membership }> {
  const store = useTenantStore();
  return useMemo(
    () =>
      store.memberships
        .filter((m) => m.workspaceId === workspaceId)
        .map((m) => ({ account: store.accounts.find((a) => a.id === m.accountId), membership: m }))
        .filter((x): x is { account: Account; membership: Membership } => !!x.account),
    [store, workspaceId],
  );
}

/** 某工作空间发出的邀请（管理视角） */
export function useInvitations(workspaceId: string | null): Invitation[] {
  const store = useTenantStore();
  return useMemo(() => store.invitations.filter((i) => i.workspaceId === workspaceId), [store.invitations, workspaceId]);
}

/** 当前账号收到的待处理邀请（收件视角，按邮箱/手机号匹配，未加入组织的也能看到） */
export function useIncomingInvitations(accountId: string | null): Array<{ invitation: Invitation; workspace: Workspace | null; inviter: Account | null }> {
  const store = useTenantStore();
  const account = store.accounts.find((a) => a.id === accountId);
  return useMemo(() => {
    if (!account) return [];
    const keys = [account.email, account.phone].map((k) => k.trim().toLowerCase()).filter(Boolean);
    return store.invitations
      .filter((i) => i.status === "pending" && keys.includes(i.email.trim().toLowerCase()))
      .filter((i) => !store.memberships.some((m) => m.workspaceId === i.workspaceId && m.accountId === account.id && m.status === "active"))
      .map((i) => ({
        invitation: i,
        workspace: store.workspaces.find((w) => w.id === i.workspaceId) ?? null,
        inviter: store.accounts.find((a) => a.id === i.invitedBy) ?? null,
      }));
  }, [store, account]);
}
