import {
  type DictEntry,
  type DictGroup,
  type DictStatus,
  type Organization,
  type OrgStatus,
  type OrgType,
  type User,
  avatarPalette,
} from "./types";

const names = [
  ["林知夏", "zhixia.lin", "产品", "admin", "active"],
  ["陈墨", "mo.chen", "设计", "manager", "active"],
  ["苏晚", "wan.su", "研发", "member", "active"],
  ["顾言", "yan.gu", "市场", "member", "invited"],
  ["沈星回", "xinghui.shen", "研发", "manager", "active"],
  ["许清和", "qinghe.xu", "运营", "member", "active"],
  ["江迟", "chi.jiang", "设计", "viewer", "suspended"],
  ["温以宁", "yining.wen", "产品", "member", "active"],
  ["陆景行", "jingxing.lu", "数据", "manager", "active"],
  ["叶知秋", "zhiqiu.ye", "市场", "viewer", "invited"],
  ["白洛", "luo.bai", "研发", "member", "active"],
  ["季舒", "shu.ji", "运营", "member", "active"],
  ["秦川", "chuan.qin", "研发", "admin", "active"],
  ["宋雨桐", "yutong.song", "设计", "member", "invited"],
  ["裴屿", "yu.pei", "产品", "viewer", "active"],
  ["孟晓", "xiao.meng", "市场", "member", "suspended"],
  ["郁南", "nan.yu", "数据", "member", "active"],
  ["季安然", "anran.ji", "运营", "manager", "active"],
] as const;

export const initialUsers: User[] = names.map((n, i) => ({
  id: `U${String(1024 + i).padStart(4, "0")}`,
  name: n[0],
  email: `${n[1]}@aura.dev`,
  department: n[2],
  role: n[3] as User["role"],
  status: n[4] as User["status"],
  avatarColor: avatarPalette[i % avatarPalette.length],
  joinedAt: `2026-${String((i % 9) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
  lastActive: i % 4 === 0 ? "刚刚" : i % 3 === 0 ? "2 小时前" : `${(i % 6) + 1} 天前`,
}));

/** 组织架构演示数据：公司 → 车间 / 部门 / 承包商，父节点用 parentId 关联 */
const orgRows: Array<
  [string, string | null, string, OrgType, string, string, string, string, OrgStatus, string, string]
> = [
  ["O1000", null, "华远智造科技有限公司", "company", "HY-ZZ", "林知夏", "021-6688 1000", "上海市浦东新区张江路 88 号", "active", "2024-03-18", "集团总部，统筹生产运营、安全管理与供应链协同。"],
  ["O1100", "O1000", "一号生产车间", "workshop", "HY-CJ-01", "沈星回", "021-6688 2101", "厂区 A 栋 1 层", "active", "2024-04-02", "负责核心部件生产与现场作业管理。"],
  ["O1110", "O1100", "精加工工段", "section", "HY-GD-0101", "苏晚", "021-6688 2111", "厂区 A 栋 1 层东侧", "active", "2024-04-10", "承担核心零部件精加工工序。"],
  ["O1115", "O1100", "装配工段", "section", "HY-GD-0102", "许清和", "021-6688 2115", "厂区 A 栋 1 层西侧", "active", "2024-04-12", "负责半成品装配与工序交接。"],
  ["O1118", "O1110", "生产一班", "department", "HY-BZ-0101", "苏晚", "021-6688 2111", "厂区 A 栋 1 层东侧", "active", "2024-04-10", "早班生产线，承担零部件加工任务。"],
  ["O1120", "O1100", "设备维护部", "department", "HY-BZ-0102", "陆景行", "021-6688 2112", "厂区 A 栋设备间", "active", "2024-04-12", "负责车间设备点检、保养与故障抢修。"],
  ["O1200", "O1000", "二号生产车间", "workshop", "HY-CJ-02", "秦川", "021-6688 2201", "厂区 B 栋 2 层", "active", "2024-05-06", "负责成品装配与包装工序。"],
  ["O1210", "O1200", "装配班组", "department", "HY-BZ-0201", "许清和", "021-6688 2211", "厂区 B 栋装配区", "active", "2024-05-15", "成品装配与首件检验。"],
  ["O1220", "O1200", "质量检验部", "department", "HY-BZ-0202", "温以宁", "021-6688 2212", "厂区 B 栋质检室", "active", "2024-05-18", "来料、过程及成品质量检验。"],
  ["O1300", "O1000", "安全管理部", "department", "HY-BZ-0301", "顾言", "021-6688 2301", "总部办公楼 3 层", "active", "2024-03-25", "负责安全生产制度、培训与隐患排查。"],
  ["O1400", "O1000", "中建安装工程队", "contractor", "HY-HT-001", "季安然", "138 0021 6688", "厂区 C 栋临时办公区", "active", "2025-01-08", "外部承包商，承接厂房机电安装工程。"],
  ["O1410", "O1400", "电气安装组", "contractor", "HY-HT-0011", "白洛", "138 0021 6690", "厂区 C 栋配电室", "active", "2025-01-20", "负责电气线路敷设与配电柜安装。"],
  ["O1500", "O1000", "环宇物流服务商", "contractor", "HY-HT-002", "江迟", "139 1188 4021", "厂区西侧物流门", "inactive", "2025-03-11", "外部物流承运商，当前合作已暂停。"],
];

export const initialOrganizations: Organization[] = orgRows.map(
  ([id, parentId, name, type, code, leader, phone, address, status, createdAt, description]) => ({
    id,
    parentId,
    name,
    type,
    code,
    leader,
    phone,
    address,
    status,
    createdAt,
    description,
  }),
);

/* ---------- 数据字典演示数据 ---------- */
export const initialDictGroups: DictGroup[] = [
  {
    id: "DG1000",
    code: "ORG_TYPE",
    name: "组织类别",
    description: "组织管理页可用的组织类型，增删改会实时影响新增下拉选项。",
    status: "enabled",
    builtin: true,
    createdAt: "2024-01-01",
  },
];

const dictEntry = (
  id: string,
  groupId: string,
  parentId: string | null,
  code: string,
  name: string,
  description: string,
  level: number,
  sort: number,
  builtin = false,
  status: DictStatus = "enabled",
  showInTop = true,
): DictEntry => ({
  id,
  groupId,
  parentId,
  code,
  name,
  description,
  level,
  sort,
  status,
  builtin,
  showInTop,
  createdAt: "2024-01-01",
});

export const initialDictEntries: DictEntry[] = [
  // 组织类别 —— code 与 OrgType 一一对应；内置项禁止删除，避免历史组织数据失去类型
  dictEntry("DE1001", "DG1000", null, "company", "公司", "集团、分子公司等法人组织", 1, 1, true, "enabled", false),
  dictEntry("DE1002", "DG1000", null, "workshop", "车间", "承担生产制造任务的基层单位", 1, 2, true, "enabled", true),
  dictEntry("DE1003", "DG1000", null, "section", "工段", "车间下属的作业区段或工序单元", 1, 3, true, "enabled", true),
  dictEntry("DE1004", "DG1000", null, "department", "部门", "职能管理与业务支持部门", 1, 4, true, "enabled", true),
  dictEntry("DE1005", "DG1000", null, "contractor", "承包商", "外部合作与施工单位", 1, 5, true, "enabled", true),
];

export const growthData = [
  { month: "1月", users: 320, sessions: 210 },
  { month: "2月", users: 410, sessions: 280 },
  { month: "3月", users: 380, sessions: 320 },
  { month: "4月", users: 520, sessions: 410 },
  { month: "5月", users: 610, sessions: 480 },
  { month: "6月", users: 580, sessions: 520 },
  { month: "7月", users: 720, sessions: 610 },
  { month: "8月", users: 810, sessions: 690 },
  { month: "9月", users: 880, sessions: 740 },
  { month: "10月", users: 1020, sessions: 860 },
  { month: "11月", users: 1180, sessions: 990 },
  { month: "12月", users: 1320, sessions: 1120 },
];

export const activityFeed = [
  { name: "林知夏", action: "创建了新项目", target: "Aura Mobile v2", time: "5 分钟前", color: avatarPalette[0] },
  { name: "沈星回", action: "邀请了新成员", target: "设计协作组", time: "32 分钟前", color: avatarPalette[4] },
  { name: "苏晚", action: "更新了系统权限", target: "研发团队", time: "2 小时前", color: avatarPalette[3] },
  { name: "陆景行", action: "导出了一份报告", target: "11 月数据概览", time: "昨天 18:20", color: avatarPalette[1] },
];
