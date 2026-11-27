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
  // ---------- 双重预防机制 · 风险分级管控字典 ----------
  {
    id: "DG2001",
    code: "RISK_OBJECT_TYPE",
    name: "风险对象类型",
    description: "风险分析对象的类型：设备、设施、场所、区域等。",
    status: "enabled",
    builtin: true,
    createdAt: "2024-01-01",
  },
  {
    id: "DG2002",
    code: "HAZARD_LEVEL",
    name: "重大危险源等级",
    description: "一级最高，四级次之，以及非重大危险源。",
    status: "enabled",
    builtin: true,
    createdAt: "2024-01-01",
  },
  {
    id: "DG2003",
    code: "INSPECTION_METHOD",
    name: "排查方式",
    description: "风险分析单元支持的排查方式：二维码、NFC、人员定位。",
    status: "enabled",
    builtin: true,
    createdAt: "2024-01-01",
  },
  {
    id: "DG2004",
    code: "EVAL_METHOD",
    name: "风险评价方法",
    description: "风险事件评价方法：LS、LEC、MES、直接判定。",
    status: "enabled",
    builtin: true,
    createdAt: "2024-01-01",
  },
  {
    id: "DG2005",
    code: "RISK_LEVEL",
    name: "风险等级",
    description: "红橙黄蓝四级风险，代码与 risk-types 保持一致。",
    status: "enabled",
    builtin: true,
    createdAt: "2024-01-01",
  },
  {
    id: "DG2006",
    code: "ACCIDENT_TYPE",
    name: "事故类型",
    description: "风险事件可能发生的事故类型（参照 GB 6441 企业职工伤亡事故分类）。",
    status: "enabled",
    builtin: true,
    createdAt: "2024-01-01",
  },
  {
    id: "DG2007",
    code: "CONTROL_CATEGORY",
    name: "管控措施分类目录",
    description: "分类1/2 为国标目录层级，分类3 为用户自定义多级目录。",
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
  allowRoot = false,
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
  allowRoot,
  createdAt: "2024-01-01",
});

export const initialDictEntries: DictEntry[] = [
  // 组织类别 —— code 与 OrgType 一一对应；内置项禁止删除，避免历史组织数据失去类型
  dictEntry("DE1001", "DG1000", null, "company", "公司", "集团、分子公司等法人组织", 1, 1, true, "enabled", false, true),
  dictEntry("DE1002", "DG1000", null, "workshop", "车间", "承担生产制造任务的基层单位", 1, 2, true, "enabled", true),
  dictEntry("DE1003", "DG1000", null, "section", "工段", "车间下属的作业区段或工序单元", 1, 3, true, "enabled", true),
  dictEntry("DE1004", "DG1000", null, "department", "部门", "职能管理与业务支持部门", 1, 4, true, "enabled", true),
  dictEntry("DE1005", "DG1000", null, "contractor", "承包商", "外部合作与施工单位", 1, 5, true, "enabled", true, true),

  // 风险对象类型
  dictEntry("DE2001", "DG2001", null, "equipment", "设备", "生产设备等", 1, 1, true),
  dictEntry("DE2002", "DG2001", null, "facility", "设施", "安全设施、公用工程设施", 1, 2, true),
  dictEntry("DE2003", "DG2001", null, "site", "场所", "作业场所、库房等", 1, 3, true),
  dictEntry("DE2004", "DG2001", null, "area", "区域", "生产区域、储存区域", 1, 4, true),

  // 重大危险源等级：code 与 HazardLevel 一致
  dictEntry("DE2011", "DG2002", null, "L1", "一级", "最高级别重大危险源", 1, 1, true),
  dictEntry("DE2012", "DG2002", null, "L2", "二级", "", 1, 2, true),
  dictEntry("DE2013", "DG2002", null, "L3", "三级", "", 1, 3, true),
  dictEntry("DE2014", "DG2002", null, "L4", "四级", "", 1, 4, true),
  dictEntry("DE2015", "DG2002", null, "none", "非重大危险源", "", 1, 5, true),

  // 排查方式
  dictEntry("DE2021", "DG2003", null, "qrcode", "二维码", "扫码查看与执行排查任务", 1, 1, true),
  dictEntry("DE2022", "DG2003", null, "nfc", "NFC", "绑定 NFC 卡编号", 1, 2, true),
  dictEntry("DE2023", "DG2003", null, "position", "人员定位", "基于定位系统触发排查", 1, 3, true),

  // 风险评价方法
  dictEntry("DE2031", "DG2004", null, "LS", "LS 风险矩阵法", "L×S", 1, 1, true),
  dictEntry("DE2032", "DG2004", null, "LEC", "LEC 作业条件危险性评价法", "L×E×C", 1, 2, true),
  dictEntry("DE2033", "DG2004", null, "MES", "MES 风险矩阵法", "M×E×S", 1, 3, true),
  dictEntry("DE2034", "DG2004", null, "direct", "直接判定法", "手动指定风险等级", 1, 4, true),

  // 风险等级：code 与 RiskLevel 一致
  dictEntry("DE2041", "DG2005", null, "red", "红 · 重大风险", "", 1, 1, true),
  dictEntry("DE2042", "DG2005", null, "orange", "橙 · 较大风险", "", 1, 2, true),
  dictEntry("DE2043", "DG2005", null, "yellow", "黄 · 一般风险", "", 1, 3, true),
  dictEntry("DE2044", "DG2005", null, "blue", "蓝 · 低风险", "", 1, 4, true),

  // 事故类型（GB 6441 常见分类）
  dictEntry("DE2051", "DG2006", null, "物体打击", "物体打击", "", 1, 1, true),
  dictEntry("DE2052", "DG2006", null, "车辆伤害", "车辆伤害", "", 1, 2, true),
  dictEntry("DE2053", "DG2006", null, "机械伤害", "机械伤害", "", 1, 3, true),
  dictEntry("DE2054", "DG2006", null, "触电", "触电", "", 1, 4, true),
  dictEntry("DE2055", "DG2006", null, "火灾", "火灾", "", 1, 5, true),
  dictEntry("DE2056", "DG2006", null, "爆炸", "爆炸", "", 1, 6, true),
  dictEntry("DE2057", "DG2006", null, "中毒和窒息", "中毒和窒息", "", 1, 7, true),
  dictEntry("DE2058", "DG2006", null, "高处坠落", "高处坠落", "", 1, 8, true),
  dictEntry("DE2059", "DG2006", null, "坍塌", "坍塌", "", 1, 9, true),
  dictEntry("DE2060", "DG2006", null, "其他伤害", "其他伤害", "", 1, 10, true),

  // 管控措施分类目录：分类1（国标大类）→ 分类2（国标子类）→ 分类3（用户自定义）
  dictEntry("DE2101", "DG2007", null, "engineering", "工程技术措施", "本质安全化、防护装置等", 1, 1, true),
  dictEntry("DE2102", "DG2007", "DE2101", "engineering-design", "本质安全设计", "", 2, 1, true),
  dictEntry("DE2103", "DG2007", "DE2101", "engineering-protection", "安全防护装置", "", 2, 2, true),
  dictEntry("DE2104", "DG2007", "DE2101", "engineering-isolation", "隔离与密闭", "", 2, 3, true),
  dictEntry("DE2111", "DG2007", null, "management", "管理措施", "制度、规程、作业许可等", 1, 2, true),
  dictEntry("DE2112", "DG2007", "DE2111", "management-system", "规章制度", "", 2, 1, true),
  dictEntry("DE2113", "DG2007", "DE2111", "management-procedure", "操作规程", "", 2, 2, true),
  dictEntry("DE2114", "DG2007", "DE2111", "management-permit", "作业许可", "", 2, 3, true),
  dictEntry("DE2121", "DG2007", null, "training", "教育培训", "安全意识、技能培训", 1, 3, true),
  dictEntry("DE2122", "DG2007", "DE2121", "training-basic", "三级安全教育", "", 2, 1, true),
  dictEntry("DE2123", "DG2007", "DE2121", "training-special", "特种作业培训", "", 2, 2, true),
  dictEntry("DE2131", "DG2007", null, "ppe", "个体防护", "劳动防护用品配备与使用", 1, 4, true),
  dictEntry("DE2132", "DG2007", "DE2131", "ppe-head", "头部防护", "", 2, 1, true),
  dictEntry("DE2133", "DG2007", "DE2131", "ppe-body", "躯体防护", "", 2, 2, true),
  dictEntry("DE2141", "DG2007", null, "emergency", "应急处置", "应急预案、演练、物资", 1, 5, true),
  dictEntry("DE2142", "DG2007", "DE2141", "emergency-plan", "应急预案", "", 2, 1, true),
  dictEntry("DE2143", "DG2007", "DE2141", "emergency-drill", "应急演练", "", 2, 2, true),
  dictEntry("DE2144", "DG2007", "DE2141", "emergency-supplies", "应急物资", "", 2, 3, true),
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
