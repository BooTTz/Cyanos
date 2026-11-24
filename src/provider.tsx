import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { type CurrentUser } from "@/lib/types";
import { bootstrap, tenantActions, useAccount, useSession } from "@/lib/tenant-store";

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, remember?: boolean) => Promise<string | null>;
  register: (input: { name: string; email: string; phone: string; password: string; code?: string }) => Promise<string | null>;
  logout: () => void;
  updateProfile: (patch: Partial<CurrentUser>) => void;
  switchWorkspace: (workspaceId: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const account = useAccount(session?.accountId ?? null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 真后端模式：先拉取权威快照，再解除 loading，避免闪现空数据
    let alive = true;
    const start = async () => {
      await bootstrap();
      if (alive) setIsLoading(false);
    };
    const fallback = setTimeout(() => alive && setIsLoading(false), 1500);
    void start();
    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, []);

  const user = useMemo<CurrentUser | null>(() => {
    // 注销冷静期账号仍可进入个人中心恢复，但不能进入任何组织工作台
    if (!account || (account.status !== "active" && account.status !== "pending-deletion")) return null;
    const deletionPending = account.status === "pending-deletion";
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      role: account.isSuperAdmin ? "admin" : "member",
      avatarColor: account.avatarColor,
      bio: account.bio,
      location: account.location,
      isSuperAdmin: account.isSuperAdmin,
      workspaceId: deletionPending ? null : (session?.workspaceId ?? null),
      deletionPending,
    };
  }, [account, session]);

  const login = useCallback(async (identifier: string, password: string) => {
    await new Promise((r) => setTimeout(r, 480));
    return tenantActions.login(identifier, password);
  }, []);

  const register = useCallback(async (input: { name: string; email: string; phone: string; password: string; code?: string }) => {
    await new Promise((r) => setTimeout(r, 480));
    return tenantActions.register(input);
  }, []);

  const logout = useCallback(() => tenantActions.logout(), []);
  const switchWorkspace = useCallback((workspaceId: string | null) => tenantActions.switchWorkspace(workspaceId), []);

  const updateProfile = useCallback(
    (patch: Partial<CurrentUser>) => {
      if (!account) return;
      tenantActions.updateAccount(account.id, {
        name: patch.name,
        email: patch.email,
        phone: patch.phone,
        bio: patch.bio,
        location: patch.location,
        avatarColor: patch.avatarColor,
      });
    },
    [account],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      switchWorkspace,
    }),
    [user, isLoading, login, register, logout, updateProfile, switchWorkspace],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
