import { useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
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
  Settings2,
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

const COLLAPSE_KEY = "cyanos-sidebar-collapsed";

type NavItemDef = {
  to?: string;
  label: string;
  icon: typeof LayoutDashboard;
  children?: NavItemDef[];
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
 * 导航图标 tile：所有状态（展开/收缩/一级/父项）尺寸恒定 44px、图标 20px。
 * 折叠时只有容器宽度和文字显隐变化，图标不缩放，避免"跳一下"的观感。
 */
function NavTile({ active, icon: Icon }: { active: boolean; icon: typeof LayoutDashboard }) {
  return (
    <span
      className={[
        "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
        active
          ? "bg-brand-gradient text-white shadow-[0_6px_18px_-4px_var(--glow-purple)]"
          : "bg-default/60 text-muted group-hover:bg-accent/12 group-hover:text-accent",
      ].join(" ")}
    >
      <Icon className="size-5" strokeWidth={active ? 2.3 : 2} />
    </span>
  );
}

/** 二级子项：连接线 + 发光圆点 + 文字，不使用重复图标，保持层级清爽 */
function SubNavList({
  children: items,
  activePath,
  onNavigate,
  compact = false,
}: {
  children: NavItemDef[];
  activePath: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <ul className={compact ? "space-y-0.5" : "border-separator/70 ml-[21px] space-y-0.5 border-l py-1 pl-3"}>
      {items.map((child) => {
        const childActive = activePath === child.to;
        return (
          <li key={child.to}>
            <NavLink
              end
              to={child.to ?? "/dashboard"}
              onClick={onNavigate}
              className={[
                "group/sub flex items-center gap-2.5 rounded-lg transition-colors duration-200",
                compact ? "px-2.5 py-2" : "px-2.5 py-1.5",
                childActive ? "bg-accent/10 text-accent" : "text-muted hover:bg-default/50 hover:text-foreground",
              ].join(" ")}
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  childActive ? "bg-accent shadow-[0_0_8px_var(--glow-purple)]" : "bg-muted/60"
                }`}
              />
              <span className={compact ? "whitespace-nowrap text-sm" : "whitespace-nowrap text-[13px]"}>
                {child.label}
              </span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

function NavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItemDef;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const hasChildren = !!item.children?.length;
  const childActive = hasChildren && !!item.children!.some((child) => location.pathname === child.to);
  const isActive = !hasChildren && location.pathname === item.to;

  /* ---------- 收缩态：tile 靠左居中，父项用右侧浮层承载二级 ---------- */
  if (collapsed) {
    const control = hasChildren ? (
      <button
        aria-label={`展开 ${item.label} 子菜单`}
        onClick={() => setFlyoutOpen((prev) => !prev)}
        className="group flex cursor-pointer justify-center rounded-2xl p-1"
      >
        <NavTile active={childActive} icon={item.icon} />
      </button>
    ) : (
      <NavLink
        end
        to={item.to ?? "/dashboard"}
        onClick={onNavigate}
        aria-label={item.label}
        className="group flex justify-center rounded-2xl p-1"
      >
        <NavTile active={isActive} icon={item.icon} />
      </NavLink>
    );

    return (
      <div className="relative">
        <Tooltip delay={100} closeDelay={0}>
          <Tooltip.Trigger>{control}</Tooltip.Trigger>
          <Tooltip.Content placement="right" showArrow>
            <p className="text-sm font-medium">{item.label}</p>
          </Tooltip.Content>
        </Tooltip>
        {hasChildren && flyoutOpen && (
          <div
            className="nav-flyout border-separator/70 bg-surface/95 absolute top-0 left-full z-40 ml-2 w-52 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl"
            onMouseLeave={() => setFlyoutOpen(false)}
          >
            <p className="text-muted mb-2 px-2.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
              {item.label}
            </p>
            <SubNavList
              activePath={location.pathname}
              onNavigate={() => {
                onNavigate?.();
                setFlyoutOpen(false);
              }}
              compact
            >
              {item.children!}
            </SubNavList>
          </div>
        )}
      </div>
    );
  }

  /* ---------- 展开态：父项内联二级，带高度过渡 ---------- */
  if (hasChildren) {
    return (
      <div className="group relative">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="hover:bg-default/50 flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-1.5 transition-colors duration-200"
        >
          <NavTile active={childActive} icon={item.icon} />
          <span
            className={`flex-1 text-left whitespace-nowrap text-sm font-medium ${
              childActive ? "text-accent" : "text-muted group-hover:text-foreground"
            }`}
          >
            {item.label}
          </span>
          <ChevronRight
            className={`text-muted size-4 shrink-0 transition-transform duration-300 ${expanded ? "rotate-90" : ""}`}
          />
        </button>
        {childActive && (
          <span className="bg-accent absolute -left-4 top-3 h-6 w-1 rounded-r-full shadow-[0_0_12px_var(--glow-purple)]" />
        )}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <SubNavList activePath={location.pathname} onNavigate={onNavigate}>
              {item.children!}
            </SubNavList>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NavLink
      end
      to={item.to ?? "/dashboard"}
      onClick={onNavigate}
      className={[
        "group relative flex items-center gap-3 rounded-xl px-2.5 py-1.5 transition-colors duration-200",
        isActive ? "bg-accent/10" : "hover:bg-default/50",
      ].join(" ")}
    >
      <NavTile active={isActive} icon={item.icon} />
      <span
        className={`whitespace-nowrap text-sm font-medium ${
          isActive ? "text-accent" : "text-muted group-hover:text-foreground"
        }`}
      >
        {item.label}
      </span>
      {isActive && (
        <span className="bg-accent absolute -left-4 h-6 w-1 rounded-r-full shadow-[0_0_12px_var(--glow-purple)]" />
      )}
    </NavLink>
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
              "group flex cursor-pointer items-center rounded-xl transition-colors duration-200",
              collapsed ? "justify-center p-1" : "w-full gap-3 px-2.5 py-1.5",
            ].join(" ")}
          >
            {/* 折叠开关与导航 tile 同为 44px，确保展开/收缩无尺寸跳变 */}
            <span className="sidebar-toggle-tile size-11">
              {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </span>
            {!collapsed && (
              <span className="text-muted group-hover:text-foreground whitespace-nowrap text-sm font-medium">
                收起导航
              </span>
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

      <nav
        className={`flex-1 overflow-y-auto py-4 ${collapsed ? "px-1" : "px-4"} ${
          collapsed ? "space-y-4" : "space-y-6"
        }`}
      >
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
                <li key={item.to ?? item.label}>
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
  const [subsystemOpen, setSubsystemOpen] = useState(false);
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

  const navGroups = useMemo(
    () => [
      {
        label: "工作台",
        items: [{ to: "/dashboard", label: "概览", icon: LayoutDashboard }],
      },
      {
        label: "管理",
        items: [
          { to: "/organizations", label: "组织管理", icon: Building2 },
          { to: "/users", label: "用户管理", icon: UsersRound },
          {
            label: "平台配置",
            icon: Settings2,
            children: [
              { to: "/roles", label: "角色与权限", icon: ShieldCheck },
              { to: "/dictionaries", label: "数据字典", icon: ListTree },
            ],
          },
        ],
      },
      ...(user?.isSuperAdmin
        ? [{ label: "系统", items: [{ to: "/admin", label: "系统管理后台", icon: ShieldAlert }] }]
        : []),
    ],
    [user?.isSuperAdmin],
  );

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

              {/* 子系统切换入口：显示当前子系统，点击展开全量弹窗 */}
              <button
                aria-label="切换子系统"
                onClick={() => setSubsystemOpen(true)}
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
                    const current =
                      subsystem.id === "workspace"
                        ? !SUBSYSTEMS.some(
                            (s) => s.id !== "workspace" && location.pathname.startsWith(s.path),
                          )
                        : location.pathname.startsWith(subsystem.path);
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
