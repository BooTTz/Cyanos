import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  LayoutGrid,
  ListTree,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/ui";
import type { RiskLevel } from "@/lib/risk-types";
import { riskLevelLabels, riskLevelShort } from "@/lib/risk-types";

/** 风险模块内部导航：五个功能页 */
export const RISK_NAV = [
  { to: "/subsystems/risk", label: "总览", icon: LayoutGrid, end: true },
  { to: "/subsystems/risk/objects", label: "风险分析对象", icon: Building2 },
  { to: "/subsystems/risk/units", label: "风险分析单元", icon: ListTree },
  { to: "/subsystems/risk/events", label: "风险事件管理", icon: ClipboardList },
  { to: "/subsystems/risk/measures", label: "管控措施管理", icon: ShieldCheck },
] as const;

export function RiskShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      {actions}
      {children}
    </div>
  );
}

/** 风险等级徽标：红橙黄蓝四色，与平台霓虹风格一致 */
export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    red: "bg-danger/15 text-danger border-danger/30",
    orange: "bg-warning/15 text-warning border-warning/30",
    yellow: "bg-amber-400/15 text-amber-500 border-amber-400/30",
    blue: "bg-accent/15 text-accent border-accent/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[level]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {riskLevelShort[level]} · {riskLevelLabels[level].replace(/（.*?）/, "")}
    </span>
  );
}

/** 统计卡：风险模块各页面复用 */
export function StatCard({
  label,
  value,
  hint,
  accent = "purple",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "purple" | "green" | "red" | "amber" | "blue";
}) {
  const accents: Record<string, string> = {
    purple: "text-accent",
    green: "text-success",
    red: "text-danger",
    amber: "text-amber-500",
    blue: "text-[var(--brand-cyan)]",
  };
  return (
    <div className="neon-card rounded-2xl p-4">
      <p className="text-muted text-xs font-medium">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accents[accent]}`}>{value}</p>
      {hint && <p className="text-muted mt-1 text-[11px]">{hint}</p>}
    </div>
  );
}

/** 模块内快捷入口条 */
export function RiskQuickNav() {
  return (
    <div className="neon-card mb-5 flex flex-wrap items-center gap-2 rounded-2xl p-3">
      <span className="text-muted mr-1 text-xs font-medium">模块导航</span>
      {RISK_NAV.filter((item) => item.to !== "/subsystems/risk").map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className="border-separator text-muted hover:border-accent/50 hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
          >
            <Icon className="size-3.5" />
            {item.label}
            <ArrowRight className="size-3" />
          </Link>
        );
      })}
    </div>
  );
}

/** 空状态提示 */
export function RiskEmpty({ text }: { text: string }) {
  return (
    <div className="text-muted flex flex-col items-center justify-center gap-2 py-14 text-sm">
      <ClipboardList className="text-muted/50 size-9" />
      <p>{text}</p>
    </div>
  );
}
