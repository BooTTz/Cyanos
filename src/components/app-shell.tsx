import { useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  ListTree,
  LogOut,
  Moon,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar, Dropdown, Tooltip } from "@heroui/react";

import { Brand } from "@/components/brand";
import { useAuth } from "@/provider";
import { roleLabels } from "@/lib/types";
import { useThemeMode } from "@/lib/use-theme";

const COLLAPSE_KEY = "cyanos-sidebar-collapsed";

type NavItemDef = { to: string; label: string; icon: typeof LayoutDashboard };

function NavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItemDef;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const location = useLocation();
  const isActive = location.pathname === item.to;

  // children 用普通元素（非函数），避免 Tooltip.Trigger clone 注入事件/ref 时关联失效
  // 图标统一放进方形 tile：收起态 44px、展开态 36px；激活用品牌渐变 + 霓虹发光，
  // 非激活用淡背景块，hover 转亮紫 —— 参考 Linear / Raycast 的 icon rail。
  const link = (
    <NavLink
      end
      onClick={onNavigate}
      to={item.to}
      aria-label={collapsed ? item.label : undefined}
      className={[
        "group relative flex items-center transition-all duration-200",
        collapsed ? "justify-center rounded-2xl p-1" : "gap-3 rounded-xl px-2.5 py-2",
        !collapsed && (isActive ? "bg-accent/10" : "hover:bg-default/50"),
      ].join(" ")}
    >
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-xl transition-all duration-200",
          collapsed ? "size-11" : "size-9",
          isActive
            ? "bg-brand-gradient text-white shadow-[0_6px_18px_-4px_var(--glow-purple)]"
            : "bg-default/60 text-muted group-hover:bg-accent/12 group-hover:text-accent",
        ].join(" ")}
      >
        <Icon className={collapsed ? "size-5" : "size-[18px]"} strokeWidth={isActive ? 2.3 : 2} />
      </span>
      {!collapsed && (
        <span className={`whitespace-nowrap text-sm font-medium ${isActive ? "text-accent" : "text-muted group-hover:text-foreground"}`}>
          {item.label}
        </span>
      )}
      {!collapsed && isActive && (
        <span className="bg-accent absolute -left-4 h-6 w-1 rounded-r-full shadow-[0_0_12px_var(--glow-purple)]" />
      )}
    </NavLink>
  );

  // 收缩态用 Tooltip 在 hover 时提示模块名
  if (collapsed) {
    return (
      <Tooltip delay={100} closeDelay={0}>
        <Tooltip.Trigger>{link}</Tooltip.Trigger>
        <Tooltip.Content placement="right" showArrow>
          <p className="text-sm font-medium">{item.label}</p>
        </Tooltip.Content>
      </Tooltip>
    );
  }
  return link;
}

function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  groups,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  groups: Array<{ label: string; items: NavItemDef[] }>;
}) {
  const collapseButton: ReactNode = onToggleCollapse && (
    <div className={`mt-auto border-t border-[var(--separator)] py-3 ${collapsed ? "px-1" : "px-4"}`}>
      <Tooltip delay={100} closeDelay={0} isDisabled={!collapsed}>
        <Tooltip.Trigger>
          <button
            aria-label={collapsed ? "展开导航" : "收起导航"}
            onClick={onToggleCollapse}
            className={[
              "group flex cursor-pointer items-center rounded-xl transition-all duration-200",
              collapsed ? "justify-center p-1" : "w-full gap-3 px-2.5 py-2",
            ].join(" ")}
          >
            {/* 折叠开关与导航 tile 同尺寸、同圆角，但用紫→绿渐变描边 btn 区分功能属性 */}
            <span className={`sidebar-toggle-tile ${collapsed ? "size-11" : "size-9"}`}>
              {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            </span>
            {!collapsed && <span className="text-muted group-hover:text-foreground whitespace-nowrap text-sm font-medium">收起导航</span>}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="right" showArrow>
          <p className="text-sm font-medium">展开导航</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-20 items-center ${collapsed ? "justify-center px-0" : "px-6"}`}>
        <NavLink to="/dashboard" onClick={onNavigate} aria-label="Cyanos 首页">
          <Brand compact={collapsed} />
        </NavLink>
      </div>

      <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? "px-1" : "px-4"} ${collapsed ? "space-y-4" : "space-y-7"}`}>
        {groups.map((group) => (
          <div key={group.label}>
            {collapsed ? (
              <div className="bg-separator mx-auto mb-3 h-px w-6" />
            ) : (
              <p className="text-muted mb-2.5 px-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
                {group.label}
              </p>
            )}
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavItem item={item} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {collapseButton}
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  // 未进入任何组织时停留在个人中心：不显示导航侧栏，仅保留左上角品牌标识
  const hasWorkspace = !!user?.workspaceId;
  // 超管后台是平台级全宽视图，不套个人中心的居中宽度限制，宽屏下表头与统计条铺满
  const isAdmin = location.pathname.startsWith("/admin");

  const navGroups = useMemo(() => [
    {
      label: "工作台",
      items: [{ to: "/dashboard", label: "概览", icon: LayoutDashboard }],
    },
    {
      label: "管理",
      items: [
        { to: "/organizations", label: "组织管理", icon: Building2 },
        { to: "/users", label: "用户管理", icon: UsersRound },
        { to: "/roles", label: "角色与权限", icon: ShieldCheck },
        { to: "/dictionaries", label: "数据字典", icon: ListTree },
      ],
    },
    ...(user?.isSuperAdmin
      ? [{ label: "系统", items: [{ to: "/admin", label: "系统管理后台", icon: ShieldAlert }] }]
      : []),
  ], [user?.isSuperAdmin]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* storage 不可用时仅保留内存态 */
      }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-canvas">
      {/* Desktop sidebar — floating glass rail, collapsible；无组织时隐藏 */}
      {hasWorkspace && (
        <aside
          className={`sidebar-rail border-separator/70 bg-surface/70 fixed inset-y-3 left-3 z-30 hidden overflow-hidden rounded-2xl border backdrop-blur-xl transition-[width,border-color,box-shadow] duration-300 ease-in-out lg:block ${
            collapsed ? "w-[68px]" : "w-[236px]"
          }`}
        >
          <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapse} groups={navGroups} />
        </aside>
      )}

      {/* Mobile sidebar overlay — always expanded */}
      {hasWorkspace && mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="关闭菜单"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="bg-surface absolute inset-y-0 left-0 w-[272px] shadow-2xl">
            <button
              aria-label="关闭菜单"
              className="text-muted hover:text-foreground absolute top-4 right-3 z-10 rounded-lg p-1.5"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} groups={navGroups} />
          </aside>
        </div>
      )}

      <div
        className={`transition-[padding] duration-300 ease-in-out ${
          !hasWorkspace ? "" : collapsed ? "lg:pl-[80px]" : "lg:pl-[260px]"
        }`}
      >
        {/* 有侧栏时内容左对齐紧贴侧栏；无侧栏（个人中心）时居中并按屏宽自适应，避免大屏右侧大片空白 */}
        <div className={`w-full px-4 pt-5 pb-5 sm:px-6 lg:px-6 ${isAdmin ? "mx-auto max-w-none" : hasWorkspace ? "mr-auto max-w-[1920px]" : "mx-auto max-w-[1680px]"}`}>
          {/* Floating controls directly on the canvas — no top bar */}
          <div className="mb-7 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {/* 无组织时：左上角保留平台图标与 Logo，作为返回个人中心的入口 */}
              {!hasWorkspace ? (
                <button
                  aria-label="返回个人中心"
                  className="flex shrink-0 cursor-pointer items-center rounded-xl transition-opacity hover:opacity-80"
                  onClick={() => navigate("/profile")}
                >
                  <Brand />
                </button>
              ) : (
                <button
                  aria-label="打开菜单"
                  className="glass text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 hover:shadow-[0_0_16px_var(--glow-purple)] lg:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <PanelLeft className="size-[19px]" />
                </button>
              )}
              <label className="glass canvas-search flex min-w-0 items-center gap-2.5 rounded-full px-4 py-2.5">
                <Search className="text-muted size-4 shrink-0" />
                <input
                  aria-label="搜索"
                  placeholder="搜索用户、项目或设置…"
                  className="text-foreground placeholder:text-muted w-full bg-transparent text-sm outline-none"
                />
              </label>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                aria-label={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
                className="canvas-btn hidden sm:inline-flex"
                onClick={toggleTheme}
              >
                {theme === "light" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
              </button>
              <button aria-label="帮助中心" className="canvas-btn hidden md:inline-flex">
                <CircleHelp className="size-[18px]" />
              </button>
              <div className="relative">
                <button aria-label="通知" className="canvas-btn">
                  <Bell className="size-[18px]" />
                </button>
                <span className="bg-danger dot-neon absolute top-1.5 right-1.5 size-2 rounded-full text-[var(--danger)] ring-2 ring-[var(--background)]" />
              </div>
              <span className="bg-separator mx-1 hidden h-6 w-px sm:block" />

              <Dropdown>
                <Dropdown.Trigger className="hover:shadow-[0_0_18px_var(--glow-purple)] flex cursor-pointer items-center gap-2 rounded-full p-1 pr-2 transition-shadow">
                  <Avatar className="size-9 shrink-0 ring-2 ring-[var(--accent)]/40">
                    <Avatar.Fallback className="text-white" style={{ background: user?.avatarColor }}>
                      {user?.name?.slice(0, 1)}
                    </Avatar.Fallback>
                  </Avatar>
                  <span className="hidden text-left xl:block">
                    <span className="text-foreground block text-sm leading-tight font-semibold">
                      {user?.name}
                    </span>
                    <span className="text-muted block text-[11px] leading-tight">
                      {user ? roleLabels[user.role] : ""}
                    </span>
                  </span>
                  <ChevronDown className="text-muted hidden size-4 xl:block" />
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom end">
                  <Dropdown.Menu aria-label="用户菜单">
                    <Dropdown.Item id="profile" textValue="个人中心" onAction={() => navigate("/profile")}>
                      <UserRound className="size-4" /> 个人中心
                    </Dropdown.Item>
                    {user?.isSuperAdmin && (
                      <Dropdown.Item id="admin" textValue="系统管理后台" onAction={() => navigate("/admin")}>
                        <ShieldAlert className="size-4" /> 系统管理后台
                      </Dropdown.Item>
                    )}
                    <Dropdown.Item id="logout" textValue="退出" variant="danger" onAction={handleLogout}>
                      <LogOut className="size-4" /> 退出
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
