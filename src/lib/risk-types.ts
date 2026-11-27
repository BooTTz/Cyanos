/**
 * 双重预防机制 · 风险分级管控数据模型
 *
 * 层级：风险分析对象 → 风险分析单元 → 风险事件 →（评价历史 / 管控措施）
 * 所有实体按 tenantId（工作空间）隔离，与平台多租户约定一致。
 */

export type RiskStatus = "active" | "inactive";
/** 重大危险源等级：一级最高，四级次之，none 表示非重大危险源 */
export type HazardLevel = "L1" | "L2" | "L3" | "L4" | "none";
/** 排查方式：二维码标签 / NFC 卡 / 人员定位 */
export type InspectionMethod = "qrcode" | "nfc" | "position";
/** 风险评价方法 */
export type EvalMethod = "LS" | "LEC" | "MES" | "direct";
/** 风险等级：红(重大) 橙(较大) 黄(一般) 蓝(低) */
export type RiskLevel = "red" | "orange" | "yellow" | "blue";

/** 风险分析对象：企业需管理的设备、设施、场所、区域等 */
export interface RiskObject {
  id: string;
  tenantId: string;
  /** 对象编码，对应原系统"风险分析对象编码" */
  code: string;
  name: string;
  /** 对象类型字典 code（设备/设施/场所/区域…） */
  typeCode: string;
  /** 责任部门（组织树节点 id 或名称） */
  departmentId: string;
  departmentName: string;
  /** 责任人（成员 id 或姓名） */
  responsibleId: string;
  responsibleName: string;
  hazardLevel: HazardLevel;
  /** 所在位置 */
  location: string;
  phone: string;
  status: RiskStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** 风险分析单元：对象的进一步拆解，作为隐患排查的最小单元 */
export interface RiskUnit {
  id: string;
  tenantId: string;
  /** 所属风险分析对象 */
  objectId: string;
  /** 单元编码（原系统如 16201 / 1620102） */
  code: string;
  name: string;
  /** 排查方式 */
  method: InspectionMethod;
  /** NFC 卡编号（method=nfc 时填写） */
  nfcCardNo: string;
  /** 二维码内容：`/risk/unit/{id}`，用于生成可打印标签 */
  qrPayload: string;
  location: string;
  /** 排查周期（天） */
  cycleDays: number;
  status: RiskStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** 一次风险评价记录：参数、方法、结果与有效期 */
export interface RiskEvaluation {
  id: string;
  tenantId: string;
  /** 所属风险事件 */
  eventId: string;
  method: EvalMethod;
  /** LS: L(1-5) S(1-5)；LEC: L E C；MES: M E S；direct 无数值 */
  values: Record<string, number>;
  /** 计算结果值（direct 时为 0） */
  score: number;
  level: RiskLevel;
  /** 有效期至（YYYY-MM-DD） */
  validUntil: string;
  evaluator: string;
  remark: string;
  evaluatedAt: string;
}

/** 风险事件：某单元可能产生的风险，经评价确定等级 */
export interface RiskEvent {
  id: string;
  tenantId: string;
  unitId: string;
  /** 事件/危险因素描述 */
  name: string;
  /** 可能发生的事故类型字典 code */
  accidentTypeCode: string;
  /** 最新评价得出的等级（冗余缓存，历史在 evaluations 中） */
  currentLevel: RiskLevel;
  /** 最新评价 id */
  currentEvaluationId: string;
  status: RiskStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** 管控措施：隶属于风险事件，按三级分类归档 */
export interface RiskMeasure {
  id: string;
  tenantId: string;
  eventId: string;
  /** 一级分类（国标目录字典 code） */
  category1: string;
  /** 二级分类（国标目录字典 code，parentId=category1） */
  category2: string;
  /** 三级分类（用户自定义字典 code，parentId=category2） */
  category3: string;
  /** 措施内容 */
  content: string;
  /** 责任部门/责任人 */
  departmentName: string;
  responsibleName: string;
  /** 执行频次 */
  frequency: string;
  status: RiskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RiskDB {
  objects: RiskObject[];
  units: RiskUnit[];
  events: RiskEvent[];
  evaluations: RiskEvaluation[];
  measures: RiskMeasure[];
}

export const emptyRiskDB = (): RiskDB => ({
  objects: [],
  units: [],
  events: [],
  evaluations: [],
  measures: [],
});

/* ---------- 展示标签 ---------- */

export const hazardLevelLabels: Record<HazardLevel, string> = {
  L1: "一级",
  L2: "二级",
  L3: "三级",
  L4: "四级",
  none: "非重大危险源",
};

export const inspectionMethodLabels: Record<InspectionMethod, string> = {
  qrcode: "二维码",
  nfc: "NFC",
  position: "人员定位",
};

export const evalMethodLabels: Record<EvalMethod, string> = {
  LS: "LS 风险矩阵法",
  LEC: "LEC 作业条件危险性评价法",
  MES: "MES 风险矩阵法",
  direct: "直接判定法",
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  red: "重大风险（红）",
  orange: "较大风险（橙）",
  yellow: "一般风险（黄）",
  blue: "低风险（蓝）",
};

export const riskLevelShort: Record<RiskLevel, string> = {
  red: "红",
  orange: "橙",
  yellow: "黄",
  blue: "蓝",
};

/* ---------- 评价算法 ----------
 * 等级阈值参照双重预防机制通用做法：
 * LS：D = L×S，≥20 红 / 15-19 橙 / 9-14 黄 / <9 蓝
 * LEC：D = L×E×C，≥320 红 / 160-319 橙 / 70-159 黄 / <70 蓝
 * MES：D = M×E×S，≥18 红 / 12-17 橙 / 6-11 黄 / <6 蓝
 * 直接判定：由用户手动指定等级
 */

export function evaluateRisk(method: EvalMethod, values: Record<string, number>, directLevel?: RiskLevel) {
  if (method === "direct") {
    return { score: 0, level: directLevel ?? "yellow" };
  }
  const n = (key: string) => Math.max(1, Number(values[key]) || 1);
  let score = 0;
  let level: RiskLevel;
  if (method === "LS") {
    score = n("L") * n("S");
    level = score >= 20 ? "red" : score >= 15 ? "orange" : score >= 9 ? "yellow" : "blue";
  } else if (method === "LEC") {
    score = n("L") * n("E") * n("C");
    level = score >= 320 ? "red" : score >= 160 ? "orange" : score >= 70 ? "yellow" : "blue";
  } else {
    score = n("M") * n("E") * n("S");
    level = score >= 18 ? "red" : score >= 12 ? "orange" : score >= 6 ? "yellow" : "blue";
  }
  return { score, level };
}

/** 各评价方法的参数定义，驱动表单动态渲染 */
export const evalParams: Record<Exclude<EvalMethod, "direct">, Array<{ key: string; label: string; hint: string; max: number }>> = {
  LS: [
    { key: "L", label: "L 发生可能性", hint: "1 极低 → 5 极高", max: 5 },
    { key: "S", label: "S 后果严重度", hint: "1 轻微 → 5 重大", max: 5 },
  ],
  LEC: [
    { key: "L", label: "L 事故发生可能性", hint: "0.1 极小 → 10 完全预期", max: 10 },
    { key: "E", label: "E 暴露频繁程度", hint: "0.5 极少 → 10 连续", max: 10 },
    { key: "C", label: "C 后果严重度", hint: "1 轻微 → 100 灾难", max: 100 },
  ],
  MES: [
    { key: "M", label: "M 控制措施状态", hint: "1 最佳 → 6 无控制", max: 6 },
    { key: "E", label: "E 暴露频率", hint: "1 极少 → 6 连续", max: 6 },
    { key: "S", label: "S 后果严重度", hint: "1 轻微 → 6 灾难", max: 6 },
  ],
};

/** 风险等级配色（与平台霓虹风格一致，红涨绿跌约定不适用此处——这是风险等级语义色） */
export const riskLevelColor: Record<RiskLevel, string> = {
  red: "danger",
  orange: "warning",
  yellow: "default",
  blue: "primary",
};
