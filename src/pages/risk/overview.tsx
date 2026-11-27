import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Building2, ChevronRight, ClipboardList, ListTree, ShieldCheck } from "lucide-react";
import { Chip } from "@heroui/react";

import { useAuth } from "@/provider";
import { useRiskData } from "@/lib/risk-store";
import { hazardLevelLabels, riskLevelLabels } from "@/lib/risk-types";
import { RiskEmpty, RiskShell, StatCard } from "./risk-shared";

/** 总览：把 对象 → 单元 → 事件 → 措施 以树状层级整合展示 */
export default function RiskOverviewPage() {
  const { user } = useAuth();
  const { db } = useRiskData(user?.workspaceId ?? null);

  const stats = useMemo(() => {
    const hazard = db.objects.filter((o) => o.hazardLevel !== "none").length;
    const byLevel = { red: 0, orange: 0, yellow: 0, blue: 0 };
    db.events.forEach((e) => (byLevel[e.currentLevel] += 1));
    return { objects: db.objects.length, units: db.units.length, events: db.events.length, measures: db.measures.length, hazard, byLevel };
  }, [db]);

  return (
    <RiskShell title="风险分级管控总览" description="按「分析对象 → 分析单元 → 风险事件 → 管控措施」四级整合展示，快速掌握风险全貌。">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="风险分析对象" value={stats.objects} hint={`重大危险源 ${stats.hazard} 个`} accent="purple" />
        <StatCard label="风险分析单元" value={stats.units} hint="隐患排查最小单元" accent="blue" />
        <StatCard label="风险事件" value={stats.events} hint={`重大风险 ${stats.byLevel.red} 项`} accent="red" />
        <StatCard label="管控措施" value={stats.measures} hint="已登记措施" accent="green" />
      </div>

      {/* 风险等级分布 */}
      <div className="neon-card mt-4 rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="text-accent size-4" />
          <h2 className="text-foreground text-sm font-semibold">风险等级分布</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["red", "orange", "yellow", "blue"] as const).map((level) => {
            const colors: Record<string, string> = {
              red: "bg-danger", orange: "bg-warning", yellow: "bg-amber-400", blue: "bg-[var(--brand-cyan)]",
            };
            return (
              <div key={level} className="border-separator flex items-center gap-3 rounded-xl border p-3">
                <span className={`size-2.5 rounded-full ${colors[level]} dot-neon`} />
                <div className="min-w-0">
                  <p className="text-muted truncate text-[11px]">{riskLevelLabels[level]}</p>
                  <p className="text-foreground text-xl font-semibold">{stats.byLevel[level]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 层级整合树 */}
      <div className="neon-card mt-4 rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTree className="text-accent size-4" />
            <h2 className="text-foreground text-sm font-semibold">风险层级清单</h2>
          </div>
          <Link to="/subsystems/risk/objects" className="text-accent inline-flex items-center gap-1 text-xs">
            管理对象 <ArrowRight className="size-3" />
          </Link>
        </div>

        {db.objects.length === 0 ? (
          <RiskEmpty text="还没有风险分析对象，先去「风险分析对象」添加一条吧。" />
        ) : (
          <div className="space-y-3">
            {db.objects.map((obj) => {
              const units = db.units.filter((u) => u.objectId === obj.id);
              return (
                <div key={obj.id} className="border-separator overflow-hidden rounded-xl border">
                  {/* 对象层 */}
                  <div className="bg-default/30 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <Building2 className="text-accent size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">{obj.name}</p>
                      <p className="text-muted mt-0.5 text-[11px]">
                        {obj.code} · {obj.departmentName || "未设部门"} · {obj.responsibleName || "未设责任人"}
                      </p>
                    </div>
                    <Chip size="sm" variant="soft" color={obj.hazardLevel === "none" ? "default" : "danger"}>
                      {hazardLevelLabels[obj.hazardLevel]}
                    </Chip>
                    <span className="text-muted text-xs">{units.length} 个单元</span>
                  </div>

                  {/* 单元 → 事件 → 措施 */}
                  {units.length > 0 && (
                    <div className="divide-separator divide-y">
                      {units.map((unit) => {
                        const events = db.events.filter((e) => e.unitId === unit.id);
                        return (
                          <div key={unit.id} className="px-4 py-3 pl-8">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <ListTree className="text-muted size-3.5" />
                              <span className="text-foreground text-xs font-medium">{unit.code} {unit.name}</span>
                              <span className="text-muted text-[11px]">{events.length} 个风险事件</span>
                            </div>
                            {events.length > 0 && (
                              <div className="mt-2 space-y-2 pl-5">
                                {events.map((event) => {
                                  const measures = db.measures.filter((m) => m.eventId === event.id);
                                  return (
                                    <div key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                      <ChevronRight className="text-muted/60 size-3" />
                                      <ClipboardList className="text-muted size-3.5" />
                                      <span className="text-muted flex-1 truncate text-xs">{event.name}</span>
                                      <span className={`size-2 rounded-full ${
                                        event.currentLevel === "red" ? "bg-danger" :
                                        event.currentLevel === "orange" ? "bg-warning" :
                                        event.currentLevel === "yellow" ? "bg-amber-400" : "bg-[var(--brand-cyan)]"
                                      }`} />
                                      <span className="text-muted text-[11px]">{measures.length} 条措施</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-accent/5 border-accent/15 mt-5 flex items-center gap-3 rounded-xl border p-4">
        <ShieldCheck className="text-accent size-5 shrink-0" />
        <p className="text-muted text-sm">
          数据按当前组织隔离保存。点击左侧「风险分级管控」下的功能页进行增删改查，字典项在「数据字典」中统一维护。
        </p>
      </div>
    </RiskShell>
  );
}
