import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
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
  ScanSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar, Chip, Dropdown, Modal, Tooltip } from "@heroui/react";

import { Brand } from "@/components/brand";
import { useAuth } from "@/provider";
import { roleLabels } from "@/lib/types";
import { useThemeMode } from "@/lib/use-theme";
import { RISK_NAV } from "@/pages/risk/risk-shared";

const COLLAPSE_KEY = "cyanos-sidebar-collapsed";

/**
 * 暂时关闭一级导航的 hover 互斥展开/收缩：子系统拆分后每组功能都不多，常展开更直接。
 * 原 hover 裁决逻辑保留在 SidebarContent，后续功能变多时把此开关改回 true 即可恢复。
 */
const ENABLE_HOVER_DRAWER = false;

/** 二级功能页：真实可路由的页面，不再承载子层级 */
type NavItemDef = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

/**
 * 一级导航「抽屉标签」：无图标，只有文字 + 横分割线的弱样式，
 * 仅作为分栏边界与 hover 热区；真正的主角是二级功能页。
 */
type NavGroupDef = {
  label: string;
  items: NavItemDef[];
};

/** 子系统注册表：目前只有标题与描述，实际功能后续按同一入口接入 */
const SUBSYSTEMS = [
  {
    id: "workspace",
    title: "Cyanos 工作台",
    description: "组织、用户与平台配置",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "risk",
    title: "风险分级管控",
    description: "风险辨识、分级与管控措施",
    path: "/subsystems/risk",
    icon: ShieldAlert,
  },
  {
    id: "inspection",
    title: "智能巡检",
    description: "巡检任务执行与隐患闭环",
    path: "/subsystems/inspection",
    icon: ScanSearch,
  },
] as const;

/**
 * 导航图标：展开态是胶囊内的圆形徽标，收缩态单独成为 44px 圆形按钮。
 * 所有状态尺寸恒定 44px / 图标 20px，折叠只改变容器与文字，不缩放图标。
 */
function NavTile({
  active,
  collapsed,
  icon: Icon,
}: {
  active: boolean;
  collapsed: boolean;
  icon: typeof LayoutDashboard;
}) {
  return (
    <span
      className={[
        "flex size-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-200",
        collapsed
          ? active
            ? "bg-brand-gradient text-white shadow-[0_6px_18px_-4px_var(--glow-purple)]"
            : "bg-default/60 text-muted group-hover:bg-accent/12 group-hover:text-accent"
          : active
            ? "bg-white/18 text-white"
            : "bg-default/70 text-muted group-hover:bg-accent/15 group-hover:text-accent",
      ].join(" ")}
    >
      <Icon className="size-5" strokeWidth={active ? 2.3 : 2} />
    </span>
  );
}

/** 二级功能页列表：展开是整条胶囊（圆形徽标 + 文字），收缩是独立的圆形按钮 */
function NavItemList({
  children: items,
  activePath,
  collapsed,
  onNavigate,
}: {
  children: NavItemDef[];
  activePath: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const active = activePath === item.to;
        return (
          <li key={item.to}>
            <NavLink
              end
              to={item.to}
              onClick={onNavigate}
              aria-label={collapsed ? item.label : undefined}
              data-active={active ? "true" : undefined}
              className={[
                "nav-item group relative flex h-11 items-center rounded-full text-sm font-medium",
                "transition-[background-color,box-shadow,color] duration-200",
                collapsed ? "w-11 justify-center" : "gap-2.5 py-1 pr-4 pl-1",
                active
                  ? collapsed
                    ? ""
                    : "bg-brand-gradient text-white shadow-[0_8px_22px_-6px_var(--glow-purple)] hover:shadow-[0_0_22px_var(--glow-purple)]"
                  : "bg-default/35 text-muted hover:bg-accent/10 hover:text-foreground",
              ].join(" ")}
            >
              <NavTile active={active} collapsed={collapsed} icon={item.icon} />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              {active && !collapsed && (
                <span className="bg-accent absolute -left-4 h-6 w-1 rounded-r-full shadow-[0_0_12px_var(--glow-purple)]" />
              )}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 一级分组 + 二级功能列表：
 * - 当前按「全部常展开」渲染：子系统切换后每组功能都不多，常显示比 hover 抽屉更直接；
 * - hover 互斥逻辑仍保留在 SidebarContent，通过开关关闭，便于后续功能变多时恢复；
 * - 展开态只保留轻量分组文字，不再画标签下横线；收缩态隐藏一级文字，仅用细线分隔各组；
 * - 二级仍是视觉主体：圆形徽标 + 文字的胶囊，收缩后只留圆形徽标。
 */
function NavGroup({
  group,
  expanded,
  active,
  collapsed,
  showDivider,
  onHoverChange,
  onNavigate,
}: {
  group: NavGroupDef;
  expanded: boolean;
  active: boolean;
  collapsed: boolean;
  showDivider: boolean;
  onHoverChange: (hovering: boolean) => void;
  onNavigate?: () => void;
}) {
  const location = useLocation();

  return (
    <div onMouseEnter={() => onHoverChange(true)} onMouseLeave={() => onHoverChange(false)}>
      {/* 一级分组头：展开态只显示轻文字；收缩态不显示标签，用细线做分组边界 */}
      {collapsed ? (
        <div className="px-1">
          {showDivider ? (
            <span className="my-2 block h-px w-full bg-separator/70" />
          ) : (
            <span className="block h-2" />
          )}
        </div>
      ) : (
        <div className="px-2.5 pt-1 pb-2">
          <span
            className={`whitespace-nowrap text-[13px] font-medium tracking-[0.06em] ${
              active ? "text-accent" : "text-muted"
            }`}
          >
            {group.label}
          </span>
        </div>
      )}

      {/* 二级功能列表：开关关闭时始终展开，保留滑动容器便于恢复 */}
      <div
        className={`nav-drawer ${
          expanded ? "nav-drawer--open" : "pointer-events-none"
        }`}
      >
        <div className="nav-drawer__inner">
          <NavItemList
            activePath={location.pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          >
            {group.items}
          </NavItemList>
        </div>
      </div>
    </div>
  );
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
  groups: NavGroupDef[];
}) {
  const location = useLocation();
  // 鼠标当前所在的分组；同一时刻只有一个分组展开。
  // 未 hover 时回落到当前路由所在分组，保证"选中概览 → 默认展开工作台"。
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  // 切换锁定：抽屉高度变化会把相邻分组推到鼠标下方，若立即响应新的 mouseenter/leave
  // 会形成"展开→布局位移→误触发另一组→回弹"的连锁抖动。切换后短时间内忽略新 hover。
  const hoverLockUntil = useRef(0);
  const clearHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (clearHoverTimer.current) clearTimeout(clearHoverTimer.current);
    },
    [],
  );

  const handleHoverChange = (label: string | null) => {
    if (label) {
      if (clearHoverTimer.current) {
        clearTimeout(clearHoverTimer.current);
        clearHoverTimer.current = null;
      }
      if (Date.now() < hoverLockUntil.current) return;
      setHoveredGroup((prev) => (prev === label ? prev : label));
      hoverLockUntil.current = Date.now() + 280;
      return;
    }
    // 离开分组不立即回落：给鼠标在组间移动/动画收尾留出缓冲，避免闪回。
    if (clearHoverTimer.current) clearTimeout(clearHoverTimer.current);
    clearHoverTimer.current = setTimeout(() => {
      setHoveredGroup(null);
      clearHoverTimer.current = null;
    }, 180);
  };

  const activeGroup =
    groups.find((g) => g.items.some((item) => item.to === location.pathname)) ?? groups[0];
  // 开关关闭时 expandedGroup 不参与裁决，所有分组常展开；原 hover 逻辑保留以便恢复。
  const expandedGroup = ENABLE_HOVER_DRAWER ? hoveredGroup ?? activeGroup?.label : null;

  const collapseButton: ReactNode = onToggleCollapse && (
    // 极简折叠开关：无胶囊背景、无文字，只留图标；展开态靠右，收缩态居中。
    <div
      className={`mt-auto py-3 ${
        collapsed ? "flex justify-center px-1" : "flex justify-end border-t border-[var(--separator)] px-3"
      }`}
    >
      <Tooltip delay={100} closeDelay={0} isDisabled={!collapsed}>
        <Tooltip.Trigger>
          <button
            aria-label={collapsed ? "展开导航" : "收起导航"}
            onClick={onToggleCollapse}
            className="text-muted hover:text-accent hover:bg-accent/10 flex size-9 cursor-pointer items-center justify-center rounded-full transition-[color,background-color,box-shadow] duration-200 hover:shadow-[0_0_12px_var(--glow-purple)]"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
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

      {/* 默认所有分组常展开；hover 互斥抽屉逻辑保留但由 ENABLE_HOVER_DRAWER 关闭 */}
      <nav
        className={`table-scroll min-h-0 flex-1 overflow-y-auto py-4 ${
          collapsed ? "space-y-1 px-1" : "space-y-3 px-4"
        }`}
      >
        {groups.map((group, index) => (
          <NavGroup
            key={group.label}
            group={group}
            collapsed={collapsed}
            active={activeGroup?.label === group.label}
            expanded={!ENABLE_HOVER_DRAWER || expandedGroup === group.label}
            showDivider={index > 0}
            onHoverChange={(hovering) => handleHoverChange(hovering ? group.label : null)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {collapseButton}
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [subsystemOpen, setSubsystemOpen] = useState(false);
  // 悬停预览显隐用显式 state 控制（不再依赖 CSS group-hover）：
  // - 鼠标进入入口/浮层 -> 打开；离开整个切换器 -> 关闭；
  // - 点击选项/入口后 suppressed=true 强制关闭，直到鼠标离开切换器才复位，
  //   避免"点完浮层还在/必须左右晃一下才重新出现"。
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSuppressed, setPreviewSuppressed] = useState(false);
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

  const inRiskSubsystem = location.pathname.startsWith("/subsystems/risk");
  const navGroups = useMemo<NavGroupDef[]>(() => {
    // 子系统是独立工作上下文：进入风险模块后侧栏只保留该子系统自己的功能组，
    // 不混入工作台/管理/系统，切回工作台后才恢复完整分组。
    if (inRiskSubsystem) {
      return [
        {
          label: "风险分级管控",
          items: RISK_NAV.map((item) => ({
            to: item.to,
            label: item.label,
            icon: item.icon,
          })),
        },
      ];
    }
    return [
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
        ? [
            {
              label: "系统",
              items: [{ to: "/admin", label: "系统管理后台", icon: ShieldAlert }],
            },
          ]
        : []),
    ];
  }, [inRiskSubsystem, user?.isSuperAdmin]);

  const activeSubsystem =
    SUBSYSTEMS.find((s) => s.id !== "workspace" && location.pathname.startsWith(s.path)) ?? SUBSYSTEMS[0];
  const ActiveIcon = activeSubsystem.icon;

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

  const enterSubsystem = (path: string) => {
    setSubsystemOpen(false);
    navigate(path);
  };

  return (
    <div className="app-canvas">
      {/* Desktop sidebar — floating glass rail, collapsible；无组织时隐藏。
          不加 overflow-hidden：收缩态二级 flyout 需要溢出到 rail 右侧展示。 */}
      {hasWorkspace && (
        <aside
          className={`sidebar-rail border-separator/70 bg-surface/70 fixed inset-y-3 left-3 z-30 hidden rounded-2xl border backdrop-blur-xl transition-[width,border-color,box-shadow] duration-300 ease-in-out lg:block ${
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
          <aside className="bg-surface absolute inset-y-0 left-0 w-[272px] overflow-y-auto shadow-2xl">
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
        <div
          className={`w-full px-4 pt-5 pb-5 sm:px-6 lg:px-6 ${
            isAdmin ? "mx-auto max-w-none" : hasWorkspace ? "mr-auto max-w-[1920px]" : "mx-auto max-w-[1680px]"
          }`}
        >
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

              {/* 子系统切换入口：hover 预览可滚动快速切换；点击入口仍打开全量弹窗。
                  显隐由外层 onMouseEnter/onMouseLeave 显式控制，覆盖入口与浮层的整块区域。 */}
              <div
                className="relative shrink-0"
                onMouseEnter={() => {
                  setPreviewSuppressed(false);
                  setPreviewOpen(true);
                }}
                onMouseLeave={() => {
                  setPreviewOpen(false);
                  setPreviewSuppressed(false);
                }}
              >
                <button
                  type="button"
                  aria-label="切换子系统"
                  onClick={() => {
                    setPreviewOpen(false);
                    setPreviewSuppressed(true);
                    setSubsystemOpen(true);
                  }}
                  className="glass group flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full px-2 transition-all duration-200 hover:shadow-[0_0_16px_var(--glow-purple)] sm:px-3"
                >
                  <span className="bg-brand-gradient flex size-6 shrink-0 items-center justify-center rounded-lg text-white">
                    <ActiveIcon className="size-3.5" />
                  </span>
                  <span className="text-foreground hidden whitespace-nowrap text-sm font-medium lg:inline">
                    {activeSubsystem.title}
                  </span>
                  <ChevronDown className="text-muted size-3.5 shrink-0" />
                </button>

                {/* 透明桥接区覆盖入口与卡片之间的 8px 空隙（仍在 onMouseEnter 区域内），
                    鼠标经过时预览不会闪退；显隐由 previewOpen/previewSuppressed 显式控制。 */}
                <div
                  className={[
                    "subsystem-preview absolute top-full left-0 z-40 w-[268px] pt-2 transition-[opacity,transform,visibility] duration-200",
                    previewOpen && !previewSuppressed
                      ? "visible translate-y-0 opacity-100"
                      : "invisible pointer-events-none translate-y-1 opacity-0",
                  ].join(" ")}
                >
                  <div className="glass rounded-2xl p-2 shadow-[0_18px_48px_-18px_var(--glow-purple)]">
                    <p className="text-muted px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-[0.08em]">
                      快速切换
                    </p>
                    <div className="table-scroll max-h-[220px] space-y-1 overflow-y-auto">
                      {SUBSYSTEMS.map((subsystem) => {
                        const Icon = subsystem.icon;
                        const current = subsystem.id === activeSubsystem.id;
                        return (
                          <button
                            key={subsystem.id}
                            type="button"
                            onClick={() => {
                              setPreviewOpen(false);
                              setPreviewSuppressed(true);
                              enterSubsystem(subsystem.path);
                            }}
                            className={[
                              "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-200",
                              current ? "bg-accent/12" : "hover:bg-accent/10",
                            ].join(" ")}
                          >
                            <span className="bg-brand-gradient flex size-8 shrink-0 items-center justify-center rounded-lg text-white">
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block truncate text-sm font-medium ${
                                  current ? "text-accent" : "text-foreground"
                                }`}
                              >
                                {subsystem.title}
                              </span>
                              <span className="text-muted block truncate text-[11px]">
                                {subsystem.description}
                              </span>
                            </span>
                            {current && (
                              <span className="bg-accent dot-neon mr-3 size-1.5 shrink-0 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-muted border-separator mt-1.5 border-t px-2 pt-2 pb-1 text-[10px]">
                      点击上方入口查看全部子系统
                    </p>
                  </div>
                </div>
              </div>

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

      {/* 子系统全量弹窗：标题级占位，后续子系统按同一注册表接入 */}
      <Modal isOpen={subsystemOpen} onOpenChange={setSubsystemOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-3xl">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>切换子系统</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-muted mb-5 text-sm leading-relaxed">
                  选择一个子系统进入。业务模块将持续接入，当前可先体验入口与切换流程。
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {SUBSYSTEMS.map((subsystem) => {
                    const current = subsystem.id === activeSubsystem.id;
                    const Icon = subsystem.icon;
                    return (
                      <button
                        key={subsystem.id}
                        onClick={() => enterSubsystem(subsystem.path)}
                        className={`neon-card group relative flex cursor-pointer flex-col items-start gap-2.5 rounded-2xl p-4 text-left transition-all duration-200 ${
                          current ? "border-accent/60" : ""
                        }`}
                      >
                        <span className="bg-brand-gradient flex size-11 items-center justify-center rounded-xl text-white shadow-[0_6px_18px_-4px_var(--glow-purple)]">
                          <Icon className="size-5" />
                        </span>
                        <span className="text-foreground font-semibold">{subsystem.title}</span>
                        <span className="text-muted text-xs leading-relaxed">{subsystem.description}</span>
                        {current && (
                          <Chip size="sm" variant="soft" color="accent" className="mt-0.5">
                            当前
                          </Chip>
                        )}
                        <ArrowUpRight className="text-muted group-hover:text-accent absolute top-4 right-4 size-4 transition-colors duration-200" />
                      </button>
                    );
                  })}
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
