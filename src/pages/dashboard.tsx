import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  Download,
  MoreHorizontal,
  TrendingUp,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { Button, Card, Chip } from "@heroui/react";

import { PageHeader, StatCard, UserAvatar } from "@/components/ui";
import { activityFeed, growthData } from "@/lib/mock-data";
import { useAuth } from "@/provider";

function GrowthChart() {
  const w = 720;
  const h = 240;
  const pad = { l: 40, r: 16, t: 16, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = 1400;
  const x = (i: number) => pad.l + (i / (growthData.length - 1)) * innerW;
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;

  const line = (key: "users" | "sessions") =>
    growthData.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[key])}`).join(" ");

  const area = (key: "users" | "sessions") =>
    `${line(key)} L ${x(growthData.length - 1)} ${pad.t + innerH} L ${x(0)} ${pad.t + innerH} Z`;

  return (
    <svg className="h-60 w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="用户增长趋势图">
      <defs>
        <linearGradient id="purpleArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-purple)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--brand-purple)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-green-strong)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand-green-strong)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g className="chart-grid">
        {[0, 350, 700, 1050, 1400].map((v) => (
          <line key={v} x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} />
        ))}
      </g>
      {[0, 350, 700, 1050, 1400].map((v) => (
        <text key={v} x={4} y={y(v) + 4} className="fill-[var(--muted)] text-[11px]">
          {v}
        </text>
      ))}

      <path d={area("users")} fill="url(#purpleArea)" />
      <path d={area("sessions")} fill="url(#greenArea)" />
      <path d={line("users")} fill="none" stroke="var(--brand-purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={line("sessions")} fill="none" stroke="var(--brand-green-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {growthData.map((d, i) =>
        i % 2 === 0 ? (
          <text key={d.month} x={x(i)} y={h - 6} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
            {d.month}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  return (
    <div>
      <PageHeader
        title={`${greeting}，${user?.name} 👋`}
        description="这是你的工作空间概览，一切都在掌控之中。"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="size-4" /> 导出报告
            </Button>
            <Button variant="primary" size="sm">
              <ArrowUpRight className="size-4" /> 查看分析
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="总用户数" value="12,840" change={12.5} icon={<UsersRound className="size-5" />} tone="purple" />
        <StatCard label="活跃用户" value="8,392" change={8.2} icon={<UserCheck className="size-5" />} tone="green" />
        <StatCard label="本月会话" value="24.6k" change={-2.4} icon={<Activity className="size-5" />} tone="blue" />
        <StatCard label="总收入" value="¥ 128.4k" change={18.7} icon={<CircleDollarSign className="size-5" />} tone="amber" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="neon-card xl:col-span-2 rounded-2xl">
          <Card.Header className="flex-row items-start justify-between px-5 pt-5">
            <div>
              <Card.Title className="text-foreground text-base">增长趋势</Card.Title>
              <Card.Description className="text-muted text-xs">用户与会话数的年度对比</Card.Description>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted flex items-center gap-1.5 text-xs">
                <span className="bg-accent size-2 rounded-full" /> 用户
              </span>
              <span className="text-muted flex items-center gap-1.5 text-xs">
                <span className="bg-success size-2 rounded-full" /> 会话
              </span>
              <Button isIconOnly size="sm" variant="ghost" aria-label="更多选项">
                <MoreHorizontal className="text-muted size-4" />
              </Button>
            </div>
          </Card.Header>
          <Card.Content className="px-3 pb-4">
            <GrowthChart />
          </Card.Content>
        </Card>

        <Card className="neon-card rounded-2xl">
          <Card.Header className="px-5 pt-5">
            <Card.Title className="text-foreground text-base">团队构成</Card.Title>
            <Card.Description className="text-muted text-xs">按角色划分的成员分布</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col items-center gap-5 px-5 pb-5">
            <div className="relative mt-2 flex size-40 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" fill="none" r="46" stroke="var(--surface-tertiary)" strokeWidth="16" />
                <circle
                  cx="60"
                  cy="60"
                  fill="none"
                  r="46"
                  stroke="var(--brand-purple)"
                  strokeDasharray="173 289"
                  strokeLinecap="round"
                  strokeWidth="16"
                />
                <circle
                  cx="60"
                  cy="60"
                  fill="none"
                  r="46"
                  stroke="var(--brand-green-strong)"
                  strokeDasharray="80 289"
                  strokeDashoffset="-181"
                  strokeLinecap="round"
                  strokeWidth="16"
                />
                <circle
                  cx="60"
                  cy="60"
                  fill="none"
                  r="46"
                  stroke="#f59e0b"
                  strokeDasharray="30 289"
                  strokeDashoffset="-269"
                  strokeLinecap="round"
                  strokeWidth="16"
                />
              </svg>
              <div className="text-center">
                <p className="text-foreground text-2xl font-bold">18</p>
                <p className="text-muted text-[11px]">团队成员</p>
              </div>
            </div>
            <div className="w-full space-y-2.5">
              {[
                { label: "管理员", value: "40%", color: "var(--brand-purple)" },
                { label: "经理", value: "28%", color: "var(--brand-green-strong)" },
                { label: "成员", value: "22%", color: "#f59e0b" },
                { label: "访客", value: "10%", color: "var(--surface-tertiary)" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: r.color }} /> {r.label}
                  </span>
                  <span className="text-foreground font-semibold">{r.value}</span>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </div>

      <Card className="neon-card mt-5 rounded-2xl">
        <Card.Header className="flex-row items-center justify-between px-5 pt-5">
          <div>
            <Card.Title className="text-foreground text-base">最近动态</Card.Title>
            <Card.Description className="text-muted text-xs">团队最新活动一览</Card.Description>
          </div>
          <Button size="sm" variant="ghost" className="text-accent">
            查看全部 <ArrowUpRight className="size-3.5" />
          </Button>
        </Card.Header>
        <Card.Content className="px-5 pb-5">
          <ul className="divide-y divide-[var(--separator)]">
            {activityFeed.map((a, i) => (
              <li className="flex items-center gap-3 py-3.5" key={i}>
                <UserAvatar name={a.name} color={a.color} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm">
                    <span className="font-semibold">{a.name}</span>{" "}
                    <span className="text-muted">{a.action}</span>{" "}
                    <Chip size="sm" variant="soft" color="accent">{a.target}</Chip>
                  </p>
                </div>
                <span className="text-muted shrink-0 text-xs">{a.time}</span>
              </li>
            ))}
          </ul>
          <div className="bg-accent/5 mt-4 flex items-center gap-3 rounded-xl px-4 py-3">
            <TrendingUp className="text-accent size-5 shrink-0" />
            <p className="text-muted text-xs">
              本月团队活跃度提升 <span className="text-accent font-semibold">18.7%</span>，继续保持！
            </p>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
