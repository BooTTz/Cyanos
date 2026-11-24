import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { Chip } from "@heroui/react";

import { PageHeader } from "@/components/ui";
import { roleLabels, type UserRole } from "@/lib/types";

const roles: { key: UserRole; desc: string; perms: string[]; color: "accent" | "success" | "warning" | "default" }[] = [
  { key: "admin", desc: "拥有工作空间的全部权限，可管理成员与设置。", perms: ["管理所有成员", "管理角色权限", "查看全部数据", "修改工作空间设置"], color: "accent" },
  { key: "manager", desc: "管理团队与项目，查看团队维度的数据。", perms: ["管理团队成员", "创建与编辑项目", "查看团队数据", "导出报告"], color: "success" },
  { key: "member", desc: "参与项目协作，编辑自己负责的内容。", perms: ["参与项目", "编辑自己的内容", "查看团队动态"], color: "warning" },
  { key: "viewer", desc: "只读访问，可查看项目与数据但无法修改。", perms: ["查看项目", "查看数据报表"], color: "default" },
];

export default function RolesPage() {
  return (
    <div>
      <PageHeader title="角色与权限" description="通过角色控制成员在工作空间中的访问范围。" />
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((r) => (
          <div className="neon-card rounded-2xl p-6" key={r.key}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-accent/12 text-accent flex size-11 items-center justify-center rounded-xl">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h3 className="text-foreground font-semibold">{roleLabels[r.key]}</h3>
                  <p className="text-muted mt-0.5 text-xs">{r.key.toUpperCase()}</p>
                </div>
              </div>
              <Chip color={r.color} variant="soft" size="sm">{r.perms.length} 项权限</Chip>
            </div>
            <p className="text-muted mt-4 text-sm">{r.desc}</p>
            <ul className="border-separator mt-5 grid gap-2 border-t pt-4 sm:grid-cols-2">
              {r.perms.map((p) => (
                <li className="text-muted flex items-center gap-2 text-xs" key={p}>
                  <Check className="text-success size-3.5 shrink-0" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="bg-accent/5 border-accent/15 mt-5 flex items-center gap-3 rounded-xl border p-4">
        <LockKeyhole className="text-accent size-5 shrink-0" />
        <p className="text-muted text-sm">权限系统会持续完善，你也可以在用户管理中单独调整每位成员的角色。</p>
      </div>
    </div>
  );
}
