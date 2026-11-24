export type UserRole = "admin" | "manager" | "member" | "viewer";
export type UserStatus = "active" | "invited" | "suspended";
export type OrgType = "company" | "workshop" | "section" | "department" | "contractor";
export type OrgStatus = "active" | "inactive";
export type DictStatus = "enabled" | "disabled";

/** 字典分类：组织类别、证件类型等；builtin 分类不可删除 */
export interface DictGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  status: DictStatus;
  builtin: boolean;
  createdAt: string;
}

/** 字典项：parentId 组成多级层级，level 为 1 起的深度 */
export interface DictEntry {
  id: string;
  groupId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string;
  level: number;
  sort: number;
  status: DictStatus;
  builtin: boolean;
  createdAt: string;
  /** 组织类别字典项是否显示在组织管理页顶部统计卡；仅 ORG_TYPE 分类有意义，缺省按内置规则处理 */
  showInTop?: boolean;
  /** 组织类别字典项是否可作为根级组织类型；仅 ORG_TYPE 有意义，缺省按内置规则（公司/承包商）处理 */
  allowRoot?: boolean;
}

/** 组织节点：用 parentId 组装树，不含岗位/部门岗位概念 */
export interface Organization {
  id: string;
  /** 所属工作空间（租户）；旧数据缺省时归入默认工作空间 */
  tenantId?: string;
  parentId: string | null;
  name: string;
  type: OrgType;
  code: string;
  leader: string;
  phone: string;
  address: string;
  status: OrgStatus;
  createdAt: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarColor: string;
  department: string;
  joinedAt: string;
  lastActive: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarColor: string;
  bio: string;
  location: string;
  isSuperAdmin: boolean;
  /** 当前选中的工作空间（租户） */
  workspaceId: string | null;
  /** 账号处于注销冷静期：仍可登录个人中心恢复，但不能进入任何组织 */
  deletionPending: boolean;
}

/* ---------- 多租户：账号 / 工作空间 / 成员 / 邀请 ---------- */

export type AccountStatus = "active" | "pending-deletion" | "disabled";
export type WorkspaceRole = "owner" | "admin" | "member";
export type MemberStatus = "active" | "invited";

/** 注销冷静期：申请后 15 天内可恢复，超管同意或到期即执行 */
export const DELETION_GRACE_DAYS = 15;

/** 全局账号：一个账号可加入多个工作空间 */
export interface Account {
  id: string;
  email: string;
  phone: string;
  name: string;
  passwordHash: string;
  avatarColor: string;
  bio: string;
  location: string;
  isSuperAdmin: boolean;
  status: AccountStatus;
  createdAt: string;
  lastActive: string;
  /** 注销申请：冷静期内可恢复，超管同意或到期后账号被禁用 */
  deletionRequestedAt: string | null;
  deletionReason: string;
  deletionExpiresAt: string | null;
}

/** 工作空间（租户）：用户注册后自行创建，创建者自动成为 owner */
export interface Workspace {
  id: string;
  name: string;
  code: string;
  type: OrgType;
  /** 组织 Logo（数据 URL 或占位色）；当前仅存储，界面暂用色块展示 */
  logo: string;
  ownerId: string;
  description: string;
  phone: string;
  address: string;
  status: OrgStatus;
  createdAt: string;
  /** 注销申请：冷静期内成员可见但不可进入，超管同意或到期后组织被删除 */
  deletionRequestedAt: string | null;
  deletionReason: string;
  deletionExpiresAt: string | null;
  deletionRequestedBy: string | null;
}

/** 成员关系：账号与工作空间的多对多关联 */
export interface Membership {
  id: string;
  workspaceId: string;
  accountId: string;
  role: WorkspaceRole;
  /** 所在部门：关联组织树节点 id，供用户管理页展示真实部门 */
  departmentId: string | null;
  status: MemberStatus;
  joinedAt: string;
}

/** 邀请：邀请账号加入工作空间 */
export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: "pending" | "accepted" | "expired";
  invitedBy: string;
  createdAt: string;
}

export const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  owner: "创建者",
  admin: "管理员",
  member: "成员",
};

export const roleLabels: Record<UserRole, string> = {
  admin: "管理员",
  manager: "经理",
  member: "成员",
  viewer: "访客",
};

export const statusLabels: Record<UserStatus, string> = {
  active: "活跃",
  invited: "已邀请",
  suspended: "已停用",
};

/** 内置兜底标签；实际展示优先取「组织类别」字典项的名称 */
export const orgTypeLabels: Record<OrgType, string> = {
  company: "公司",
  workshop: "车间",
  section: "工段",
  department: "部门",
  contractor: "承包商",
};

/** 字典不可用时的兜底：根级组织默认只有公司与承包商；正常情况由字典项 allowRoot 决定 */
export const ROOT_ORG_TYPES: OrgType[] = ["company", "contractor"];

export const dictStatusLabels: Record<DictStatus, string> = {
  enabled: "启用",
  disabled: "停用",
};

export const orgStatusLabels: Record<OrgStatus, string> = {
  active: "启用",
  inactive: "停用",
};

export const avatarPalette = [
  "oklch(0.62 0.24 292)",
  "oklch(0.72 0.19 152)",
  "oklch(0.65 0.2 25)",
  "oklch(0.6 0.18 230)",
  "oklch(0.68 0.17 320)",
  "oklch(0.7 0.15 85)",
];
