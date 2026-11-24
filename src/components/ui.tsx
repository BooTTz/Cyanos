import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Avatar, Chip } from "@heroui/react";

import { roleLabels, statusLabels, type UserRole, type UserStatus } from "@/lib/types";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="text-muted mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  icon,
  tone = "purple",
}: {
  label: string;
  value: string;
  change: number;
  icon: ReactNode;
  tone?: "purple" | "green" | "amber" | "blue";
}) {
  const positive = change >= 0;
  const toneMap = {
    purple: "bg-accent/12 text-accent",
    green: "bg-success/15 text-[var(--brand-green-deep)]",
    amber: "bg-warning/15 text-warning",
    blue: "bg-sky-500/12 text-sky-500",
  };
  return (
    <div className="neon-card rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <span className={`inline-flex size-11 items-center justify-center rounded-xl ${toneMap[tone]}`}>
          {icon}
        </span>
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold ${
            positive ? "bg-success/12 text-[var(--brand-green-strong)]" : "bg-danger/12 text-danger"
          }`}
        >
          {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {Math.abs(change)}%
        </span>
      </div>
      <p className="text-muted mt-5 text-sm">{label}</p>
      <p className="text-foreground mt-1 text-[28px] leading-none font-bold tracking-tight">{value}</p>
      <p className="text-muted mt-2 text-xs">较上月</p>
    </div>
  );
}

export function RoleChip({ role }: { role: UserRole }) {
  const colorMap: Record<UserRole, "accent" | "success" | "warning" | "default"> = {
    admin: "accent",
    manager: "success",
    member: "warning",
    viewer: "default",
  };
  return (
    <Chip color={colorMap[role]} size="sm" variant="soft">
      {roleLabels[role]}
    </Chip>
  );
}

export function StatusChip({ status }: { status: UserStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`size-1.5 rounded-full ${
          status === "active"
            ? "bg-success"
            : status === "invited"
              ? "bg-warning"
              : "bg-danger"
        }`}
      />
      <span className="text-foreground text-sm">{statusLabels[status]}</span>
    </span>
  );
}

export function UserAvatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const px = size === "lg" ? "size-11" : size === "sm" ? "size-7" : "size-9";
  return (
    <Avatar className={`${px} shrink-0`}>
      <Avatar.Fallback className="text-white" style={{ background: color }}>{name.slice(0, 1)}</Avatar.Fallback>
    </Avatar>
  );
}
