import { useCallback, useEffect, useState } from "react";

import { emptyRiskDB, type RiskDB } from "./risk-types";

/**
 * 风险分级管控数据层（双模式）：
 * - 本地开发：localStorage 持久化 + 模块级事件同步
 * - 线上：检测到 VITE_API_BASE 后走 /api/risk（真后端按租户隔离）
 *
 * 页面只依赖本文件暴露的 hooks / actions，不关心存储细节。
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "";
const USE_API = API_BASE.length > 0;
const STORAGE_PREFIX = "cyanos-risk-v1";
const CHANGE_EVENT = "cyanos:risk-changed";

const keyOf = (tenantId: string) => `${STORAGE_PREFIX}:${tenantId}`;

function readLocal(tenantId: string): RiskDB {
  try {
    const raw = localStorage.getItem(keyOf(tenantId));
    if (raw) {
      const parsed = JSON.parse(raw) as RiskDB;
      if (Array.isArray(parsed.objects)) return parsed;
    }
  } catch {
    // 存储不可用时静默回退
  }
  return emptyRiskDB();
}

function writeLocal(tenantId: string, db: RiskDB) {
  try {
    localStorage.setItem(keyOf(tenantId), JSON.stringify(db));
  } catch {
    // 隐私模式下仅内存有效
  }
}

/** 与服务端交换 token：复用 tenant-store 保存的登录令牌 */
function getToken(): string {
  try {
    return localStorage.getItem("cyanos-token-v1") || "";
  } catch {
    return "";
  }
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 读取指定租户的风险数据快照 */
export async function fetchRisk(tenantId: string): Promise<RiskDB> {
  if (!USE_API) return readLocal(tenantId);
  const res = await fetch(`${API_BASE}/risk?workspaceId=${encodeURIComponent(tenantId)}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`加载风险数据失败：${res.status}`);
  const data = await res.json();
  return data.db as RiskDB;
}

/** 用完整快照覆盖写入（写少读多，简单可靠） */
export async function saveRisk(tenantId: string, db: RiskDB): Promise<void> {
  if (!USE_API) {
    writeLocal(tenantId, db);
    emit();
    return;
  }
  const res = await fetch(`${API_BASE}/risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ workspaceId: tenantId, db }),
  });
  if (!res.ok) throw new Error(`保存风险数据失败：${res.status}`);
  emit();
}

/** 订阅风险数据变更（同页多组件 + 跨标签页） */
export function useRiskData(tenantId: string | null) {
  const [db, setDb] = useState<RiskDB>(() => (tenantId ? readLocal(tenantId) : emptyRiskDB()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId) {
      setDb(emptyRiskDB());
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchRisk(tenantId);
      setDb(next);
      if (!USE_API) writeLocal(tenantId, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const refresh = () => {
      if (tenantId) setDb(readLocal(tenantId));
    };
    listeners.add(refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    const onStorage = (event: StorageEvent) => {
      if (tenantId && event.key === keyOf(tenantId)) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [tenantId]);

  /** 修改数据并持久化；updater 返回新快照 */
  const mutate = useCallback(
    async (updater: (current: RiskDB) => RiskDB) => {
      if (!tenantId) return;
      const next = updater(db);
      setDb(next);
      writeLocal(tenantId, next);
      try {
        await saveRisk(tenantId, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存失败");
      }
    },
    [tenantId, db],
  );

  return { db, loading, error, mutate, reload };
}

/** 生成风险模块 ID：前缀 + 时间戳 + 随机，与平台现有风格一致 */
export const riskId = (prefix: string) =>
  `${prefix}${Date.now().toString(36).toUpperCase().slice(-7)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
