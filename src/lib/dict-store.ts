import { useEffect, useMemo, useState } from "react";

import { initialDictEntries, initialDictGroups } from "./mock-data";
import { orgTypeLabels, ROOT_ORG_TYPES, type DictEntry, type DictGroup, type OrgType } from "./types";

export interface DictState {
  groups: DictGroup[];
  entries: DictEntry[];
}

// 版本化 key：更换内置字典数据后提升版本号，避免旧 localStorage 快照覆盖新默认数据
const STORAGE_KEY = "cyanos-dictionaries-v2";
const CHANGE_EVENT = "cyanos:dictionaries-changed";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function readInitial(): DictState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DictState;
      if (Array.isArray(parsed.groups) && Array.isArray(parsed.entries)) return parsed;
    }
  } catch {
    // 存储不可用时静默回退到内置字典
  }
  return { groups: clone(initialDictGroups), entries: clone(initialDictEntries) };
}

let state: DictState | null = null;
const listeners = new Set<() => void>();

function getState(): DictState {
  if (!state) state = readInitial();
  return state;
}

function commit(next: DictState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式下无法写入，仅保持本次会话内有效
  }
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 订阅字典变更：同页多组件与跨标签页都会同步 */
export function useDictionaries(): DictState {
  const [snapshot, setSnapshot] = useState<DictState>(() => getState());

  useEffect(() => {
    const refresh = () => {
      const current = getState();
      setSnapshot({ groups: [...current.groups], entries: [...current.entries] });
    };
    listeners.add(refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return snapshot;
}

export const dictActions = {
  addGroup(group: DictGroup) {
    const current = getState();
    commit({ ...current, groups: [...current.groups, group] });
  },
  updateGroup(id: string, patch: Partial<DictGroup>) {
    const current = getState();
    commit({
      ...current,
      groups: current.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    });
  },
  deleteGroup(id: string) {
    const current = getState();
    const removed = new Set<string>([id]);
    const collect = (parentId: string | null) => {
      current.entries
        .filter((entry) => entry.groupId === id && entry.parentId === parentId)
        .forEach((entry) => {
          removed.add(entry.id);
          collect(entry.id);
        });
    };
    collect(null);
    commit({
      groups: current.groups.filter((g) => !removed.has(g.id)),
      entries: current.entries.filter((e) => !removed.has(e.id)),
    });
  },
  addEntry(entry: DictEntry) {
    const current = getState();
    commit({ ...current, entries: [...current.entries, entry] });
  },
  updateEntry(id: string, patch: Partial<DictEntry>) {
    const current = getState();
    commit({
      ...current,
      entries: current.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },
  /** 按给定顺序重排同一父节点下的兄弟项，sort 规范化为 1..n，保证排序稳定生效 */
  reorderSiblings(groupId: string, parentId: string | null, orderedIds: string[]) {
    const current = getState();
    const rank = new Map(orderedIds.map((id, index) => [id, index + 1]));
    commit({
      ...current,
      entries: current.entries.map((e) =>
        e.groupId === groupId && e.parentId === parentId && rank.has(e.id)
          ? { ...e, sort: rank.get(e.id)! }
          : e,
      ),
    });
  },
  deleteEntry(id: string) {
    const current = getState();
    const removed = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      current.entries.forEach((entry) => {
        if (entry.parentId && removed.has(entry.parentId) && !removed.has(entry.id)) {
          removed.add(entry.id);
          changed = true;
        }
      });
    }
    commit({ ...current, entries: current.entries.filter((e) => !removed.has(e.id)) });
  },
  reset() {
    commit({ groups: clone(initialDictGroups), entries: clone(initialDictEntries) });
  },
};

const fallbackOrgTypes = (Object.keys(orgTypeLabels) as OrgType[]).map((value) => ({
  value,
  label: orgTypeLabels[value],
}));

/** 组织新增下拉的数据源：只取「组织类别」字典中启用的项，按 sort 排序 */
export function useOrgTypeOptions(): Array<{ value: OrgType; label: string }> {
  const { groups, entries } = useDictionaries();
  return useMemo(() => {
    const group = groups.find((g) => g.code === "ORG_TYPE" && g.status === "enabled");
    if (!group) return fallbackOrgTypes;
    const items = entries
      .filter((e) => e.groupId === group.id && e.status === "enabled")
      .sort((a, b) => a.sort - b.sort);
    if (items.length === 0) return fallbackOrgTypes;
    return items.map((entry) => ({
      value: entry.code as OrgType,
      label: entry.name,
    }));
  }, [groups, entries]);
}

/** 根级组织新增下拉的数据源：ORG_TYPE 中启用且勾选「可作为根级」的项；旧快照缺省按内置公司/承包商处理 */
export function useRootOrgTypeOptions(): Array<{ value: OrgType; label: string }> {
  const { groups, entries } = useDictionaries();
  return useMemo(() => {
    const group = groups.find((g) => g.code === "ORG_TYPE" && g.status === "enabled");
    if (!group) {
      return ROOT_ORG_TYPES.map((value) => ({ value, label: orgTypeLabels[value] }));
    }
    const items = entries
      .filter((e) => e.groupId === group.id && e.status === "enabled")
      .filter((e) => (e.allowRoot ?? ROOT_ORG_TYPES.includes(e.code as OrgType)))
      .sort((a, b) => a.sort - b.sort);
    if (items.length === 0) {
      return ROOT_ORG_TYPES.map((value) => ({ value, label: orgTypeLabels[value] }));
    }
    return items.map((entry) => ({ value: entry.code as OrgType, label: entry.name }));
  }, [groups, entries]);
}

/** 组织管理页顶部统计卡的类型源：ORG_TYPE 中启用且勾选「显示在顶部」的项，最多 6 个 */
export function useOrgTopTypes(): Array<{ code: string; name: string }> {
  const { groups, entries } = useDictionaries();
  return useMemo(() => {
    const group = groups.find((g) => g.code === "ORG_TYPE" && g.status === "enabled");
    if (!group) return [];
    return entries
      .filter((e) => e.groupId === group.id && e.status === "enabled")
      // 兼容旧快照：showInTop 缺省时按内置规则（company 不占顶部卡，其余显示）
      .filter((e) => (e.showInTop ?? e.code !== "company"))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 6)
      .map((e) => ({ code: e.code, name: e.name }));
  }, [groups, entries]);
}

/** 组织节点展示用的类型名称，优先取字典，未配置时回退内置标签或字典编码 */
export function useOrgTypeLabels(): Record<string, string> {
  const { groups, entries } = useDictionaries();
  return useMemo(() => {
    const labels: Record<string, string> = { ...orgTypeLabels };
    const group = groups.find((g) => g.code === "ORG_TYPE");
    if (group) {
      entries
        .filter((e) => e.groupId === group.id)
        .forEach((e) => {
          labels[e.code] = e.name;
        });
    }
    return labels;
  }, [groups, entries]);
}
