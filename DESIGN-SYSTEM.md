# Cyanos 视觉设计规范（Design System Standard）

> **适用范围**：Cyanos 平台所有现有页面与后续增量开发。
> **文档地位**：本文件是视觉层的**唯一事实来源（Single Source of Truth）**。任何颜色、渐变、发光、布局、组件用法的改动，都应先更新本文，再改代码；反之亦然。
> **最后更新**：2026-11-27（风险分级管控子系统上线）

---

## 1. 品牌定位

| 项目 | 规范 |
|------|------|
| 平台名称 | **Cyanos**（注意首字母大写，其余小写） |
| 副标 | `platform`（全小写，字距 `0.18em`，大写风格） |
| 字体栈 | **全局统一**，定义在 `globals.css` 的 `body`：`Inter` + 系统无衬线 + `PingFang SC`/`Microsoft YaHei`。中文字符由苹方/雅黑呈现（本身圆润）；**禁止为单个组件引入独立字体或圆体**，局部样式只调字号、字重、字距 |
| 定位 | 面向企业的 toB 行业应用 / 数字协作平台 |
| 主色 | 亮紫（neon purple）+ 亮薄荷绿（neon green），青色作为过渡 |
| 气质 | 现代、灵动、霓虹感、企业级可信赖 |
| Logo | 六边形轮廓 + 内部钻石形，白色描边，位于紫→绿渐变圆角方块上 |
| 站点图标（favicon） | **必须与平台 Logo 一致**：紫→深紫(42%)→绿 `135deg` 渐变圆角方块 + 白色六边形轮廓 + 白色钻石形；禁止使用框架默认图标 |
| 鼠标光标 | **全站使用绿色发光指针**（`public/cursor/cursor.png`）：用户提供的标准指针 path，薄荷绿 `#00B292` + 青绿柔光、无白边；热区 `(5 5)` 对准左上尖端；图形已水平镜像使尖端朝左上（与系统鼠标一致）；输入框保留系统 `text` I-beam |

**favicon 实现规范**：

- 源文件：`public/favicon.svg`（唯一事实来源），与 `src/components/brand.tsx` 的 `BrandMark` 图形一致；`viewBox="0 0 32 32"`，`rx=10`，渐变 `#A26CFF → #872CF8(42%) → #00C877`（由品牌 Oklch 换算）。
- 兼容文件：`public/favicon.ico`（16/24/32/48/64 多尺寸，由同一图形栅格化），项目根目录 `favicon.ico` 为同一副本，禁止残留 Next.js / Vite 默认图标。
- `index.html` 仅保留两条引用：SVG 优先 + ICO 兜底，禁止重复或 `type` 与文件格式不匹配：

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

**自定义光标实现规范**：

- 资源：`public/cursor/cursor.png`（32×32，`@supports` + fallback 到 `auto`/`pointer`）。图形来自用户提供的标准鼠标指针 SVG path（IconFont 风格圆角三角指针，尖端指向左上），纯薄荷绿填充 + 青绿三层高斯柔光，**无白色描边**（白描边只属于浏览器插件的贴纸，非平台光标）。源文件：`~/Downloads/指针.svg`。
- 色值：填充 `#00B292`（与 `--brand-green-deep` 薄荷绿同色系），柔光 `rgba(0,235,180,0.9)`。
- 热区：`url(...) 5 5` 对准指针尖端（左上尖角）；不写热区会导致点击位置偏移。注意：更换图形后必须重算热区坐标，沿用旧值会错位。
- 应用范围（`globals.css` 末尾 `@supports` 块）：`html, body` 默认指针 + `button, a, [role=button], .cursor-pointer` 全部替换；**文本输入框/textarea/contenteditable 保留 `text`**，禁止把 I-beam 也替换掉（可用性）。
- 反模式：不要在透明画布上直接对 RGBA 做 GaussianBlur（黑色会渗透成方形黑影），要用 L 模式 mask 模糊后 putalpha；不要用白边箭头、不要用系统手型作 fallback 之外的混搭、不要忘记热区坐标。

**文案调性**：中文简洁专业，围绕"企业工作台、统一身份与权限、组织管理、单点登录、经营洞察"等 toB 词汇。避免消费级/游戏化措辞。

---

## 2. 技术栈基线（锁定版本，勿随意升级）

| 依赖 | 版本 | 说明 |
|------|------|------|
| React | ^19.0.0 | — |
| **@heroui/react** | **3.2.7（精确锁定）** | 必须是 **v3**，API 与 v2 不兼容 |
| @heroui/styles | ^3.2.7 | 提供基础 token（`--snow`/`--eclipse` 等） |
| Tailwind CSS | 4.3.3 | v4，通过 `@tailwindcss/vite` 接入 |
| Vite | 8.3.1 | — |
| TypeScript | 5.9.3 | — |
| react-router-dom | 6.30.6 | — |
| lucide-react | ^1.75.0 | **唯一图标来源**（品牌社交图标除外） |
| clsx / tailwind-variants | 2.1.1 / 3.3.1 | 类名合并与变体 |

`globals.css` 顶部两行 import 是必需的，顺序不可颠倒：

```css
@import "tailwindcss";
@import "@heroui/styles";
@custom-variant dark (&:is(.dark *));
```

---

## 3. 色彩系统

所有颜色以 **OKLCH** 定义。禁止在业务代码中硬编码 hex / rgb（图表分类色等极少数例外见 §11）。

### 3.1 品牌色板（`:root`）

| Token | 值 | 用途 |
|-------|-----|------|
| `--brand-purple` | `oklch(0.68 0.25 292)` | 主紫：主按钮、强调、图表主线 |
| `--brand-purple-deep` | `oklch(0.55 0.27 296)` | 渐变深端 |
| `--brand-purple-soft` | `oklch(0.95 0.035 292)` | 浅紫底 |
| `--brand-green` | `oklch(0.87 0.22 158)` | 亮薄荷绿：渐变终点、氛围光 |
| `--brand-green-deep` | `oklch(0.72 0.2 160)` | 深绿：亮色主题文字/图标 |
| `--brand-green-soft` | `oklch(0.96 0.05 158)` | 浅绿底 |
| `--brand-cyan` | `oklch(0.83 0.16 205)` | 青：渐变中段、暗色链接 |
| `--glow-purple` | `oklch(0.68 0.25 292 / 0.45)` | 紫色光晕（暗色 → `0.76 0.25 296 / 0.55`） |
| `--glow-green` | `oklch(0.87 0.22 158 / 0.4)` | 绿色光晕（暗色 → `0.9 0.23 158 / 0.5`） |
| `--canvas` | `oklch(0.975 0.012 292)` | 亮色画布底色 |

### 3.2 主题感知强绿 `--brand-green-strong`

该 token 是**图表绿线、涨跌标签、强调用绿**的唯一入口，随主题自动变化：

- 亮色：`var(--brand-green-deep)` → `oklch(0.72 0.2 160)`，保证白底可读
- 暗色：`oklch(0.9 0.23 158)`，更亮更饱和，呈霓虹灯管感

> 历史坑：该变量曾被多处引用却未定义，导致图表绿线/涨跌色失效。现已纳入色板，**禁止删除或改成字面量**，新增绿色强调一律用它。

### 3.3 亮色主题（`:root, [data-theme="light"]`）

| Token | 值 |
|-------|-----|
| `--accent` / `--focus` | `var(--brand-purple)` |
| `--accent-foreground` | `var(--snow)` |
| `--success` | `var(--brand-green-deep)` |
| `--success-foreground` | `var(--eclipse)` |
| `--background` | `var(--canvas)` |
| `--surface` | `oklch(1 0 0 / 0.82)` |
| `--surface-foreground` | `var(--eclipse)` |
| `--surface-secondary` | `oklch(0.972 0.012 292)` |
| `--surface-tertiary` | `oklch(0.95 0.018 292)` |
| `--border` | `oklch(0.9 0.02 292)` |
| `--separator` | `oklch(0.915 0.018 292)` |
| `--field-background` | `oklch(1 0 0)` |
| `--field-foreground` | `var(--eclipse)` |
| `--field-border` | `oklch(0.9 0.02 292)` |
| `--radius` / `--field-radius` | `0.8rem` / `calc(var(--radius) * 1.4)` |

### 3.4 暗色主题（`[data-theme="dark"]`）

**硬性要求：不是纯黑 + 白线，而是带紫蓝色倾向的整体深色。**

| Token | 值 |
|-------|-----|
| `--background` | `oklch(0.135 0.022 285)` ← 深紫蓝，禁止改成 `#000` |
| `--surface` | `oklch(0.175 0.028 286 / 0.86)` |
| `--surface-secondary` / `--surface-tertiary` | `oklch(0.21 0.032 286)` / `oklch(0.25 0.038 288)` |
| `--border` / `--separator` | `oklch(0.3 0.05 292 / 0.7)` / `oklch(0.29 0.045 290 / 0.7)` |
| `--foreground` / `--muted` | `oklch(0.97 0.01 292)` / `oklch(0.72 0.03 292)` |
| `--accent` / `--focus` | `oklch(0.76 0.25 296)` / `oklch(0.78 0.24 296)`（比亮色更亮） |
| `--success` | `oklch(0.9 0.23 158)`（霓虹绿） |
| `--field-background` / `--field-border` | `oklch(0.2 0.03 286)` / `oklch(0.31 0.05 292 / 0.8)` |
| `--link` | `var(--brand-cyan)` |
| `--backdrop` | `oklch(0.08 0.02 285 / 0.72)` |

基础 token（`--snow`、`--eclipse`、`--foreground`、`--muted`、`--danger`、`--warning`、`--default` 等）由 `@heroui/styles` 提供并自带暗色切换；上表只列本项目覆盖的部分，其余继承 HeroUI 默认。

---

## 4. 渐变与发光规范

### 4.1 画布氛围（`.app-canvas`）

所有主内容页根元素必须是 `.app-canvas`：全屏铺底、三层固定径向渐变、紫在左上、绿在右上、青在底部，`background-attachment: fixed`。暗色下换用更暗透明的对应色。这是"霓虹渐变感"的来源，**不要移除或改成纯色背景**。

### 4.2 渐变工具类

| 类名 | 定义 | 使用场景 |
|------|------|----------|
| `.bg-brand-gradient` | `135deg` 紫 → 深紫(42%) → 深绿 | Logo 方块、登录页营销区（侧栏升级卡已移除） |
| `.bg-neon-gradient` | `120deg` 紫 → 青(50%) → 亮绿 | 大面积强调区块 |
| `.text-brand-gradient` | `120deg` 紫 → 深绿，`background-clip: text` | 标题文字渐变 |

### 4.3 霓虹发光层（核心视觉资产）

| 类名 | 效果 | 用法 |
|------|------|------|
| `.neon-card` | 半透明玻璃卡片；hover 紫色描边 + `0 12px 40px -16px` 紫色光晕 | **所有卡片容器**必须带此类 |
| `.button--primary` | 紫色外发光 + 内高光；hover 光晕扩散 + `brightness(1.06)`；active 下沉 1px；暗色双层光晕 | 主按钮需要强发光时叠加 |
| `.button--danger` | 红色柔光 + 内高光；hover 光晕扩散；active 下沉 1px | 退出组织、注销组织、同意注销、注销账户等危险确认按钮，必须与 HeroUI `variant="danger"` 叠加使用 |
| `.glow-green` | 同上的绿色版本 | 绿色主操作/成功态强调 |
| `.canvas-btn` | 40px 圆形玻璃按钮；hover 紫色描边 + 双层光晕浮起（**无位移**，避免边缘抖动） | 画布上的所有圆形功能按钮 |
| `.sidebar-toggle-tile` | 与导航 tile 同构的方形按钮：`rounded-xl`、紫→绿半透明渐变底、渐变描边；图标亮色用 `--brand-purple-deep`（在淡底上对比更强），暗色用 `var(--accent)`；hover 图标转 `var(--snow)`、底色切实心品牌渐变 + 紫绿双光晕 + 1px 亮紫描边（**无位移**） | 侧栏底部折叠 / 展开开关专用，**不要**沿用导航的默认灰 tile |
| `.dot-neon` | 双层 `currentColor` 光晕 | 状态圆点、通知红点 |
| `.glass` | `blur(18px) saturate(140%)` + 1px 描边 | 搜索胶囊等玻璃控件 |

### 4.4 动效

- 过渡时长统一 `0.15s`（按压）～`0.3s`（光晕/边框），缓动用 `ease`。
- 搜索胶囊展开：`.canvas-search` 用 `transition: width 0.32s cubic-bezier(0.22, 1, 0.36, 1)`，`focus-within` 时 `width: 300px → 600px` 并叠加紫色光晕（暗色再加 1px 亮紫描边光晕）。这是"点击后向后拉长一倍"的标准实现，勿改用 `transform: scaleX`（会拉伸文字/图标）。
- 搜索胶囊 **hover**（未聚焦）也要有反馈：`:hover` 加紫色描边 + `0 8px 24px -12px var(--glow-purple)` 柔和阴影（无位移），与内容卡片 `.neon-card` 的悬浮语言一致。
- 登录页漂浮光斑 `.blob`：`blur(64px)`，`pulse-glow 9s` + `float-a 12s` / `float-b 14s`。
- 必须保留 `prefers-reduced-motion` 下关闭 blob 动画的媒体查询。
- 滚动条、图表网格线样式已在 `globals.css` 统一定义，勿在页面内重复写。

---

## 5. 布局规范（强约束）

### 5.1 无顶部导航栏

**禁止出现任何 sticky / fixed 顶部栏。** 搜索与功能按钮直接浮在底层画布上。

### 5.2 桌面布局

```
┌──────────────────────────────────────────────┐
│ app-canvas（固定渐变铺底）                    │
│ ┌────────┐                                   │
│ │ 玻璃侧栏 │   [🔍 搜索胶囊]   [🌙][?][🔔] [👤] │ ← 浮动控件行
│ │ 236px  │                                   │
│ │ 悬浮轨道 │   ┌──────── 页面内容 ────────┐    │
│ │        │   │ PageHeader + neon-card  │    │
│ └────────┘   └────────────────────────┘    │
└──────────────────────────────────────────────┘
```

- 侧栏：`fixed inset-y-3 left-3`，展开宽 `236px` / 收缩宽 `68px`，`rounded-2xl`，`backdrop-blur-xl`，`z-30`，仅 `lg` 以上显示。四周留白 = 悬浮感。宽度带 `transition-[width] duration-300 ease-in-out`；底部为折叠开关（见 §5.6）。**不再放升级卡片**。收缩宽度必须贴合 44px 方形 tile：rail 内边距 `px-1` + 链接 `p-1` + tile `size-11`（44px），两侧仅留约 4px 余量，禁止出现图标两侧大片空白。
- 主区：`lg:pl-[260px]`（展开）/ `lg:pl-[80px]`（收缩，rail 右缘 12+68=80px，零额外缝隙），带 `transition-[padding] duration-300` 与侧栏同步；内容容器 `mr-auto w-full max-w-[1920px]`（**左对齐，不要 `mx-auto`**），`px-4 sm:px-6 lg:px-6 pt-5 pb-5`。左对齐 + `1920px` 上限：宽屏下内容从侧栏右缘 + 24px 处开始铺开，避免宽屏中间居中导致侧栏与内容之间出现巨大空档、而内容本身反而显得窄挤（参考 TDesign 等后台在超宽屏下的左对齐策略）。**如需再次调整内容区宽度，只改此处的 `max-w` 值；如需调整画布左右留白，只改这里的 `px`（当前 `lg:px-6`，原 `lg:px-9` 已收窄）。** 底部留白用 `pb-5`（20px）：内容未达 max-height、表格不滚动时，卡片下方不预留过大空白。
- 浮动控件行：`mb-7`，左为搜索胶囊（`.glass .canvas-search`，`rounded-full`），右为圆形 `canvas-btn` 组 + 分隔线 + 用户头像下拉。搜索胶囊默认宽 `300px`，**点击/聚焦后宽度向右拉长约一倍到 `600px`**（`focus-within` + `width` 过渡，见 §4.4）；`≤1280px` 收敛为 `min(600px, 50vw)`，`≤640px` 手机端保持 `min(300px, 52vw)` 不扩张，避免挤压右侧控件。宽度必须由 `.canvas-search` 自身控制，**不要**用父级百分比/`w-full`，否则 flex 收缩会让动画卡顿或失效。
- 导航层级：**弱样式一级分组 + 图标二级功能页**两级，互斥抽屉交互。一级标签「工作台 / 风险分级管控」「管理」「系统」（**仅超管可见**）无图标，只有文字 + 横分割线，只作分栏边界与 hover 热区；二级才是视觉主体，用 44px 图标 tile + 文字呈现——工作台下「概览」，管理下「组织管理 / 用户管理 / 角色与权限 / 数据字典」，系统下「系统管理后台」`/admin`。**进入风险子系统后首组动态切换为「风险分级管控」**，二级为总览 + 四个功能页（对象 / 单元 / 事件 / 措施），由 `RISK_NAV` 注册，内容区不再重复导航。**个人中心与偏好设置不放侧栏入口**——个人中心从右上角头像下拉进入，偏好设置已并入个人中心的 Tab。同一时刻只展开一个分组：鼠标滑到哪组哪组展开、其余收起；鼠标离开后回到当前路由所属分组。一级文字在其组内任一二级页激活时转 accent，组暂时收起时旁边显示发光小圆点标记；二级激活项用渐变 tile + 左侧 4px 发光竖条。超管分组由 `user.isSuperAdmin` 动态控制，普通账号完全看不到。
- 侧栏底部为折叠开关（"收起导航 / 展开导航"），位于 `border-t` 分隔线上方。**无升级企业版卡片**（已移除，避免占据侧栏空间）。
- **无组织态（未进入任何组织，`user.workspaceId == null`）**：侧栏导航整体不渲染，主区取消 `lg:pl-[260px]`/`lg:pl-[80px]`，内容直接顶到画布左侧；浮动控件行左侧改放 `<Brand />`（可点击返回 `/profile`），其余搜索/主题/通知/头像控件保持不动。移动端同样不显示菜单按钮与抽屉。个人中心是该状态的唯一落点，主要操作是创建或接受邀请进入组织；一旦 `workspaceId` 生效即恢复完整侧栏，并进入实际功能首页 `/dashboard`。参考实现：`app-shell.tsx` 的 `hasWorkspace`。

### 5.3 响应式

- `<lg`：侧栏变抽屉（宽 `272px`），遮罩 `bg-black/50 backdrop-blur-sm`，由 `canvas-btn` 菜单键唤起。
- 主题切换 `sm` 以上显示，帮助按钮 `md` 以上显示，用户名/角色 `xl` 以上显示。
- 栅格：`sm` 两列、`xl` 四列（统计卡）；`xl:grid-cols-3` 且主卡 `xl:col-span-2`（图表区）。

### 5.4 表格分页栏（`Table.Footer`）

数据表格的分页栏统一采用**三栏网格** `grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center`，三块各司其职：

- **左**：`显示 X–Y 条，共 N 条` 统计文字，必须加 `whitespace-nowrap`（占一行不换行），`justify-self-start`。
- **中**：`Pagination` 组件，`justify-self-center` 精确居中（不要用 `justify-between` 让分页随两侧宽度漂移）。省略号规则：仅显示首页、末页及当前页 ±1，跨度大于 1 时用 `…`。
- **右**：每页条数快捷按钮，选项固定为 `10 / 25 / 50`（**最少 10，不提供更小值**），`justify-self-end`；用 `PAGE_SIZE_OPTIONS` 常量数组渲染，当前选中项 `variant="primary"`，其余 `variant="ghost"`；点击后 `setPageSize(n)` 并**重置 `page` 为 1**。
- 每页条数用 state 管理（默认 `10`），分页切片与统计文字都基于它计算，**禁止写死常量**。窄屏下三块自动堆叠为单列。
- 参考实现：`src/pages/users.tsx` 的 `Table.Footer`。

### 5.5 表格内部独立滚动（列表区不随页面滚动）

数据表格的**行区域**在自身容器内独立纵向滚动，页面主体不随之滚动，分页栏始终停留可见：

- 容器：`Table.ScrollContainer` 加 `table-scroll max-h-[clamp(360px,56vh,640px)] overflow-y-auto`。高度用 `clamp(360px, 56vh, 640px)`——小屏保底 360px，常规屏约 56vh，超大屏封顶 640px，避免过高/过矮。横向仍由 HeroUI 的 `min-w-[720px]` 内容触发横向滚动，双轴可滚。
- 表头吸顶：`Table.Header` 加 `sticky top-0 z-10 bg-[var(--surface-secondary)]`。背景必须用不透明的 `--surface-secondary`（明暗主题均已定义），否则滚动时行内容会透过表头。
- **行头必填**：每张表的第一个 `Table.Column` 必须加 `isRowHeader`。HeroUI v3 在集合刷新时校验，缺失会抛 `A table must have at least one Column with the isRowHeader prop set to true` 并让整页白屏（数据增删后尤其明显）。
- 滚动隔离：全局 CSS `.table-scroll` 设 `overscroll-behavior: contain`，防止列表滚到顶/底时把滚动链传递给外层页面（即"不随页面滚动"的关键）；并覆盖细滚动条 `scrollbar-width: thin` / `::-webkit-scrollbar { width: 8px }`，配色沿用全局主题化滚动条。
- 结构顺序固定：`Table.Header`（吸顶）→ `Table.Body`（内部滚动）→ `Table.Footer`（三栏分页，**在 ScrollContainer 之外**、始终可见不参与滚动）。
- **表格必须用 `variant="secondary"` 平铺变体，圆角只由外层卡片提供一层**：HeroUI `<Table>` 默认 `variant="primary"` 是"灰色大圆角容器（`table-root` 自带 `border-radius: min(32px,…)` + `bg-surface-secondary` + `px-1 pb-1`）+ 内嵌白色圆角表格卡片（`table__body` 首末行单元格 `border-radius: min(32px, --radius-2xl)`）"的嵌套结构，内嵌圆角卡片时会出现**表头直角 / 数据行白卡大圆角 / 外层卡片圆角**三层叠加，视觉上"内外圆角反了"。规范做法：所有表格显式写 `<Table variant="secondary">`（无灰底、无内边距、表体直角），外层卡片加 `overflow-hidden rounded-2xl` 统一裁切一层圆角；并在 `globals.css` 覆盖 `.neon-card .table-root--secondary :is(th.table__column:first-child, th.table__column:last-child) { 四个 border-*-radius: 0 }`，清掉 secondary 表头首末列残留的圆角。`.neon-card .table-root--primary { border-radius: 0 }` 仅作兜底，**不要**依赖它——它清不掉表体单元格的内嵌圆角。
- 参考实现：`src/pages/users.tsx` 与 `src/pages/admin.tsx` 表格区（均为 `variant="secondary"`）+ `globals.css` 的 `.table-scroll` 与 `.table-root--secondary` 圆角覆盖。

### 5.6 侧栏折叠 / 展开与互斥抽屉导航

桌面端侧栏支持收起为图标轨道，节省横向空间给内容画布；导航为**弱样式一级分组 + 图标二级功能页**两级结构，同一时刻只展开一个分组。一级标签（工作台 / 风险分级管控 / 管理 / 系统）只作分栏边界与 hover 热区，二级才是真实可路由的功能页（概览 / 风险分级管控五页 / 组织管理 / 用户管理 / 角色与权限 / 数据字典 / 系统管理后台）；进入风险子系统后首组由「工作台」替换为「风险分级管控」：

- **状态**：`app-shell.tsx` 内 `collapsed` boolean，持久化到 `localStorage` 的 `cyanos-sidebar-collapsed`（`"1"` = 收缩）。刷新后保持用户选择。仅桌面端生效；移动端抽屉始终展开，不受此状态影响。
- **宽度联动**：侧栏 `w-[236px]`（展开）/ `w-[68px]`（收缩），`aside` 加 `transition-[width,border-color,box-shadow] duration-300 ease-in-out`；主区 padding `lg:pl-[260px]` / `lg:pl-[80px]` 加 `transition-[padding] duration-300` 同步过渡。收缩态 rail 右缘与主区 padding 起点重合（12px 定位 + 68px 宽 = 80px），不再额外留缝。**`aside` 不要加 `overflow-hidden`**：会裁掉展开项左侧的发光竖条；宽度动画期间的文字显隐由折叠状态控制。
- **主次原则（核心）**：一级标签 **无图标**，采用**文字在上、完整细线在下**的分栏标题弱样式——展开态 `text-[13px] font-medium tracking-[0.08em]`（不用 `uppercase`/宽字距，中文标签保持柔和圆润；激活 `text-accent`，其余 `text-muted`）+ `mt-1.5 h-px w-full bg-separator`；收缩态文字 `text-[10px]` 居中、细线仍在下方。**字体栈不单独引入圆体**——沿用 `body` 的 Inter + 苹方/微软雅黑（中文字符本身圆润），靠降低字重、收窄字距获得柔和感；换字体家族会与全站割裂，禁止为一级标签单独换字体。**禁止**文字右侧拖短横线（像尾巴、视觉重心不稳），也禁止给一级加图标、tile 或箭头。一级只承担「分栏边界 + hover 热区」，二级功能页才是视觉主体：每项用 **44px 方形 tile + 20px 图标 + 文字**（`NavTile`），展开/收缩态同构。
  - **tile 三态**（展开/收起完全一致）：激活 `bg-brand-gradient text-white shadow-[0_6px_18px_-4px_var(--glow-purple)]`；默认 `bg-default/60 text-muted`；hover `group-hover:bg-accent/12 group-hover:text-accent`。
  - 展开态二级激活项额外有文字 `text-accent` + 左侧 `-left-4` 发光竖条；收缩态只保留渐变 tile，不加竖条。激活态用 `useLocation()` 手动计算，不用函数式 children。
  - **图标尺寸恒定**：展开与收缩统一 `size-11`（44px）tile / `size-5`（20px）图标，折叠只收窄容器与隐藏文字，图标不缩放、不位移，消除跳跃感。外层链接 `rounded-xl p-1`；收缩态 `nav` 内边距 `px-1`，tile 几乎填满 rail（两侧约 4px）。

- **互斥抽屉交互（核心）**：数据结构为 `NavGroupDef`（`label/items` 一级，**无 icon**）+ `NavItemDef`（`to/label/icon` 二级），二级不再有 `children`。
  - **裁决逻辑**：`SidebarContent` 用**单一 state** `hoveredGroup` 决定展开组——`expandedGroup = hoveredGroup ?? activeGroup`（`activeGroup` 为当前路由所属分组，找不到时回落到第一组）。鼠标进入某分组（含其二级列表区域）即 `setHoveredGroup(group.label)`，该组展开、其余同步收起；鼠标在该组范围内移动不会触发收起；鼠标离开所有分组后 `hoveredGroup` 归 `null`，自动恢复当前路由所在分组。因此自然得到示例流程：选中概览 → 默认展开工作台；滑到管理 → 管理展开、工作台收起（保留激活标记）；移出管理 → 恢复工作台；在管理中点选组织管理 → 之后默认展开管理。
  - **激活标记**：二级激活项为渐变 tile + `text-accent` + 发光竖条；其所属一级标签文字转 `text-accent`。若该组因 hover 其他组而暂时收起，一级标签右侧显示 `dot-neon` 发光小圆点，标明选中项所在位置。
  - **滑动动画**：二级列表包在 `.nav-drawer` 中，用 `grid-template-rows: 0fr ↔ 1fr` + `opacity` 做上下滑动（`0.32s cubic-bezier(0.22, 1, 0.36, 1)`）；开口只在展开时给 `padding-top: 0.375rem`，收起归零；`pointer-events-none` 防止透明子项仍可点。系统开启 `prefers-reduced-motion` 时关闭过渡。
  - **收缩态同样竖排**：不再有右侧 flyout。收缩态一级文字降到 9px 居中、二级只显示图标 tile 竖排，仍遵循互斥抽屉——展开哪组就显示哪组图标；底部折叠开关位置恒定，不因切换上下跳动。
  - **滚动**：`nav` 用 `overflow-y-auto table-scroll`（功能增多时可滚动），`aside` 仍不加 `overflow-hidden`——否则会裁掉展开项左侧的发光竖条。
  - Mobile 抽屉始终用展开态文字版呈现两级，逻辑与桌面一致。
- **折叠开关**：侧栏底部，**展开态保留 `border-t` 分隔线，收缩态去掉 `border-t`**——收缩时那条线只剩一小截、看起来像多余的"条"。tile **同为 44px**（与导航完全一致，均 `rounded-xl`，外层按钮 `p-1`），且**必须使用 `.sidebar-toggle-tile` 彩色渐变按钮**，不能用导航的默认灰 tile —— 图标用 `var(--accent)`，底色为紫绿半透明渐变 + 渐变描边，hover 转实心品牌渐变并叠加紫绿双光晕。展开时 tile + "收起导航"文字，收缩时仅 tile 居中（`PanelLeftClose` / `PanelLeftOpen`，图标 20px）。
- **侧栏容器（`.sidebar-rail`）hover**：hover 时描边转亮紫 + 柔和外发光，与搜索条/内容卡片同一套反馈；只改颜色与阴影，不改宽度/位置，避免与折叠动画或鼠标进出相互干扰产生抖动。导航项图标 tile 在 hover 时加 1px 紫色内描边。
- **移动菜单按钮**：右上角/左上角触发抽屉的按钮用 `PanelLeft` 图标 + 方形玻璃按钮（`glass ... rounded-xl size-10`），**不用**汉堡 `Menu` 三条线，与方形 tile 语言统一。
- **hover 提示**：折叠开关用 `<Tooltip>`，触发器**必须**用 `<Tooltip.Trigger>` 包裹（同 Dropdown 的坑——原生元素/NavLink 不会自动成为触发器）；`placement`、`showArrow` 写在 `<Tooltip.Content>` 上，`delay`/`closeDelay` 写在 `<Tooltip>` 根上。展开态用 `isDisabled` 关闭提示。**一级标签与二级功能页都不套 Tooltip**——一级本身已有文字标签；二级收缩态靠图标 tile + 互斥展开直接可见，再套提示会与抽屉内容重叠。
- **重要**：`Tooltip.Trigger` 内的 NavLink **children 必须是普通元素**（如直接写 `<Icon/>` + `<span/>`），不能用函数式 children `{({isActive}) => ...}`——函数 children 会导致 Trigger clone 注入的事件/ref 关联失效，Tooltip 不显示。激活态改用 `useLocation()` 手动计算 `isActive`。
- 参考实现：`src/components/app-shell.tsx`（`NavGroup` 弱样式一级 + `NavItemList` 图标二级 + `SidebarContent` 的 `hoveredGroup` 互斥裁决 + `AppShell` 的 collapsed 状态）；滑动动画在 `globals.css` 的 `.nav-drawer`。

### 5.7 组织管理页面（`/organizations`）

面向企业安全生产场景的**组织架构**模块，**不包含"部门岗位"及任何岗位相关功能**。

- **整体布局**：`PageHeader` + 紧凑统计条（第一格固定「组织总数」，其余类型卡由「组织类别」字典的显示开关动态生成，**最多 6 个**；容器 `grid gap-3` + `gridTemplateColumns: repeat(auto-fit, minmax(180px, 1fr))` 自适应列数）+ 两栏工作区 `.org-workspace`（`grid gap-5`，`lg` 起 `grid-template-columns: minmax(300px,340px) minmax(0,1fr)`，`xl` 左栏放宽到 `320–360px`）；两栏各自用 `neon-card org-panel rounded-2xl`，左树右详情。类型卡的数量/名称/顺序取自 `useOrgTopTypes()`；新增类别默认显示，可在字典页用 Pin 开关取消，超限（>6）时拒绝开启并提示。
- **面板高度绑定视口（不随内容增长）**：`.org-workspace` 在 `lg` 以上设 `height: clamp(520px, calc(100dvh - 300px), 760px)`；`.org-panel` 设 `height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden`（窄屏保留 `min-height: 520px`）；仅内容区 `.org-panel__body` 滚动（`min-height: 0; flex: 1 1 0; overflow-y: auto`）。**所有 flex 祖先必须 `min-height: 0`**，否则树节点/字段增减会把面板和页面一起撑高。小屏（`<lg`）树体额外保留 `max-h-[60vh]`，`lg` 以上由面板接管高度（`lg:max-h-none`）。
- **左侧组织树**：
  - 数据源 `initialOrganizations`（`parentId` 组装树）；组织**类型不写死**，由「组织类别」字典决定（预置公司 / 车间 / 工段 / 部门 / 承包商，可随时新增，见 §5.8）。
  - 节点结构：可展开箭头 → 类型方形 tile 图标 → 名称 → 类型 `Chip`（`variant="soft"`），图标与色彩一一对应：公司 `Building2`/accent、车间 `Factory`/success、工段 `Workflow`/warning、部门 `UsersRound`/default、承包商 `HardHat`/default。
  - 选中态：整行 `bg-accent/10`、文字 `text-accent`、左侧 4px 发光竖条；操作按钮（新增下级、更多）平时 `opacity-0`，`group-hover` / 选中 / `focus-within` 时显现。
  - 树支持搜索（名称 / 编码 / 负责人），命中节点时保留其祖先以免子树消失；树区 `table-scroll org-panel__body` 独立滚动，高度随视口面板（见上条），**不再按节点数量撑高**。
  - **新增分两个入口**（树头部「新增」下拉）：选项**全部来自「组织类别」字典，不经过任何硬编码白名单**——`在「X」下新增` 用 `useOrgTypeOptions()` 取全部**启用**项（按 `sort`，含字典新增类别如分厂/工厂，且**不按父节点类型收窄**）；`新增根级组织` 用 `useRootOrgTypeOptions()` 取启用且 `allowRoot=true` 的项（旧快照缺省按公司/承包商兼容）。字典项在编辑弹窗配置「可作为根级组织」，列表显示「可根级」标记。`ROOT_ORG_TYPES` 只作字典不可用时的兜底，`CHILD_ORG_TYPES` 已废弃。**禁止**再用类型常量 `.filter()` 创建下拉，否则新增字典项不会自动可用。
- **右侧基本信息**：默认**查看态**，用 `InfoField` 网格展示组织名称、组织编码、组织类型、上级组织、负责人、联系电话、所在地址、创建日期、组织状态、组织说明。点击页面右上角「编辑」进入**编辑态**：字段换成 `TextField + InputGroup`，组织类型/状态用 `Select`，底部「取消 / 保存修改」；保存后同步刷新树节点名称与统计，退出编辑态。
- **树节点操作**：Hover 行上的 `+` 在对应节点下新增（弹窗填名称与类型，自动继承编码前缀并选中新节点）；`MoreHorizontal` 下拉为「编辑名称」「删除组织」。删除需二次确认，会级联删除整个子树并在文案中说明数量；根节点公司不提供删除入口。
- **禁止**：引入岗位、部门岗位、人员编制字段；在树里用裸文字代替类型图标/标签；把编辑态做成独立页面而不是当前卡片内切换；把组织类型写死在页面常量里而不走字典。

### 5.8 数据字典页面（`/dictionaries`）

平台级基础功能，统一维护业务字典项；导航位于「管理」组的角色与权限下方。

- **数据模型**（`src/lib/types.ts`）：`DictGroup`（`id/code/name/description/status/builtin/createdAt`）+ `DictEntry`（`id/groupId/parentId/code/name/description/level/sort/status/builtin/createdAt/showInTop?`）。`parentId` 组成**无限层级**，`level` 为 1 起的深度（**由上级字典派生：`level = parent.level + 1`，表单里只读、不手填**），`sort` 控制同级顺序；`builtin` 项禁止删除，防止内置业务字典被清空。`showInTop` 仅 `ORG_TYPE` 分类有意义，控制是否出现在组织管理页顶部统计卡，缺省时按内置规则（company 不显示、其余显示）兼容旧快照；`allowRoot` 仅 `ORG_TYPE` 有意义，控制是否出现在根级组织创建下拉，缺省时按内置规则（company / contractor 可）兼容旧快照。
- **共享数据源**（`src/lib/dict-store.ts`）：localStorage key `cyanos-dictionaries-v2`（版本化：内置默认数据变更时提升版本号，避免旧快照覆盖新默认值）；模块级 `listeners` + `CHANGE_EVENT` 实现同页多组件同步，`storage` 事件实现跨标签页同步。页面组件统一用 `useDictionaries()` 读取、用 `dictActions` 写入，**不要**各自维护字典副本。
- **页面布局**：`PageHeader`（含「恢复默认」「新增分类」）+ 四格统计（分类数 / 字典项总数 / 已启用 / 已停用）+ 两栏 `.dict-workspace`（左分类 `260–320px`，右字典项树）；复用 §5.7 的视口绑定面板规则，面板类为 `.dict-panel` / `.dict-panel__body`。
- **分类管理**：列表展示名称、编码、项数；搜索按名称/编码/描述；新增/编辑用 Modal（编码全局唯一）；内置分类只可编辑与启停，不可删除；删除分类级联删除其下全部层级的字典项（二次确认）。
- **字典项管理**：树形缩进 + 展开收起 + `L{n}` 层级标签；搜索命中时保留祖先链；节点操作含新增子项、编辑、上移/下移、启停、删除（级联子树并二次确认）；内置项编码不可改。表单中「上级字典项」用 `Select`，需排除自身及其子树，防止形成环；**「层级」随上级自动派生、只读**。**编辑必须提交 `parentId`**（新建分支本就有），否则改上级后节点不会真正移动——树位置只认 `parentId`，`level` 只是展示数字。换上级时 `sort` 放到新父节点末尾避免重复。**上移/下移用 `dictActions.reorderSiblings()` 按数组顺序整体重排、sort 规范化为 1..n**，不要只交换两个 sort 值（重复值会失效）。`ORG_TYPE` 项的编辑表单另有「可作为根级组织」选项（是/否），对应 `allowRoot` 字段，控制该类别能否用于新建根级组织。
- **与组织管理联动**：分类编码 `ORG_TYPE` 为组织类别源。`useOrgTypeOptions()` 只返回该分类中**启用**的项并按 `sort` 排序，决定组织新增下拉与编辑态类型选项；`useOrgTypeLabels()` 决定组织树、详情的类型名称（含字典新增类型，返回 `Record<string,string>`）；`useOrgTopTypes()` 决定顶部统计卡，取启用且 `showInTop` 的项、按 sort 排序、**最多 6 个**。`useRootOrgTypeOptions()` 决定根级组织创建下拉（启用 + `allowRoot`，旧快照缺省 company/contractor）。因此**改名、停用、排序、新增类别会实时反映到组织页顶部卡、新增/编辑下拉以及个人中心「创建组织」下拉——新增字典项无需改代码**。字典页 `ORG_TYPE` 项操作区的 **Pin 按钮**切换 `showInTop`（开启时若已达 6 个则拒绝并提示）。组织页类型图标/色彩用 `getMeta(type)` 带兜底（`META_FALLBACK`），**新增类型（如 plant）不能因 `TYPE_META` 为 undefined 而白屏**。不要绕过字典直接改 `orgTypeLabels` 常量。
- **参考实现**：`src/pages/dictionaries.tsx`、`src/lib/dict-store.ts`；预置字典见 `src/lib/mock-data.ts`。**当前只预置「组织类别」一个内置分类**（公司 / 车间 / 工段 / 部门 / 承包商 5 项），它同时是组织页的真实数据源；其他业务字典暂不预置演示数据，需要时通过页面「新增分类」自行创建。多级层级与排序能力由数据模型支持，不依赖预置示例展示。

### 5.9 多租户与账号体系（`/login` `/register` `/profile` `/admin`）

平台级 SaaS 能力：注册账号 → 创建/加入工作空间（租户）→ 邀请成员 → 超管统管。账号数据由 `src/lib/tenant-store.ts` 统一提供，**页面只依赖 `useTenantStore()` / `useSession()` / `tenantActions`**，不直接碰存储。

- **数据模型**（`src/lib/types.ts`）：`Account`（全局账号，`isSuperAdmin`/`status`/`passwordHash` + 注销申请字段 `deletionRequestedAt/deletionReason/deletionExpiresAt`）、`Workspace`（租户，ownerId、Logo + 对应注销申请字段与 `deletionRequestedBy`）、`Membership`（账号×租户多对多，含 `role: owner|admin|member`、`departmentId`、`status`）、`Invitation`（邀请）。`CurrentUser` 携带 `id/isSuperAdmin/workspaceId/deletionPending`；`AccountStatus` 为 `active | pending-deletion | disabled`，`DELETION_GRACE_DAYS = 15`。
- **存储抽象（双模式，已实现）**：`tenant-store.ts` 按 `import.meta.env.VITE_API_BASE` 自动切换。未配置（本地 dev）= localStorage（`cyanos-tenant-db-v1` / `cyanos-session-v1` / `cyanos-token-v1`），可离线预览；配置 `VITE_API_BASE=/api`（部署到 Vercel）= 走真后端 `/api/*`，数据落 Neon Postgres。**页面接口完全不变**（`useTenantStore` / `useSession` / `tenantActions` / 派生 hooks）。启动流程：`AuthProvider` 先 `await bootstrap()` 拉 `/api/state` 权威快照再解除 loading；写操作经 `mutate()` 发 `/api/mutations` 并用服务端返回的快照刷新本地镜像。
- **真后端**（`api/` + `database/schema.sql`）：Neon 表主键直接用前端字符串 ID（`ACC-*` / `WS-*` / `MEM-*`），前后端 ID 一致、无映射表。`api/_lib/db.ts` 负责 snake_case ↔ camelCase 映射与按账号隔离的 `readSnapshot`（普通账号只见所在工作空间，超管见全平台）；`api/_lib/auth.ts` 提供 scrypt 密码哈希 + HMAC 会话令牌。接口：`POST /api/auth?action=send-code|register|login|logout`、`GET /api/auth?action=me`、`GET /api/state`、`POST /api/mutations`。密钥只走 Vercel 环境变量（`DATABASE_URL` / `JWT_SECRET` / `VITE_API_BASE`），前端不持有数据库口令。数据库 schema 与种子见 `database/schema.sql`、`scripts/seed-admin.mjs`（`npm run seed` 生成可执行的 INSERT SQL）。完整步骤见 `api/README.md`。
- **认证**：邮箱或手机号 + 密码注册/登录，验证码 5 分钟有效；本地模式 `verification.send/verify` 页面生成并显示，真后端模式由 `POST /api/auth?action=send-code` 生成（`verification_codes` 表暂存，演示仍返回 code 供页面展示）。本地 `hashPassword` 是轻量哈希仅用于离线演示，真后端一律 scrypt + 随机盐。**预置账号**：`wechat@cyanos.cn`（示例组织创建者/管理员）、`CyanAdmin`（超级管理员，密码 `CyanOS1120`），由 `npm run seed` 写入 Neon。
- **个人中心结构**：注册成功跳 `/profile`。页面主标题是唯一带辅助描述的位置；其下分区标题 **「我的组织」/「消息待办」/「个人设置」** 只保留标题本身，不写解释性副文案。未加入任何组织时显示默认渐变背景引导卡 + 创建按钮；已有组织则显示组织卡片网格。卡片下方 **24px（`mt-6`）** 间隔后放置消息待办卡，只处理收到的邀请；不再放工作台/创建快捷入口。`WorkspaceGuard` 守卫：已登录但无 `workspaceId` 时，除个人中心外一律重定向 `/profile`。**无侧栏态布局**：`!hasWorkspace` 时主容器改为 `mx-auto max-w-[1680px]` 居中自适应，避免宽屏内容偏左、右侧大片空白；有侧栏时仍 `mr-auto max-w-[1920px]` 左对齐贴住侧栏。
- **组织卡片默认选中**：选中优先级为「手动点击 > 当前工作空间 `workspaceId` > 仅一个组织时自动选中 > `getLastWorkspaceId()` 上次进入的组织」。`switchWorkspace(id)` 在 id 非空时写入 `cyanos-last-workspace-v1`；注销冻结会话后仍能记住上次进入的组织，刷新后默认选中它。
- **组织卡片与危险操作**：组织名称/编码/类型/角色/成员数/待接受邀请数统一合并进卡片，不再另设长条卡。所有卡片等高 `min-h-[184px]`；点击信息区仅选中，选中后**仅用描边加强 + 紫色外发光**表达状态，**不再画顶部渐变横线**。底部独立操作区显示「进入工作台 / 成员管理 / 邀请成员 / 退出组织」。**成员管理**（仅 `owner/admin` 可见）点击后弹出全屏居中 Modal（`sm:max-w-[920px]`），展示该组织全部成员，表格与用户管理同款（`variant="secondary"` + `isRowHeader` + sticky 表头 + 三栏分页），字段为「用户名 / 账号 / 组织内角色 / 加入时间 / 操作」；角色列同时显示组织内角色（`workspaceRoleLabels`）与关联的角色与权限（`roleLabels`，owner/admin→管理员、member→成员）；支持姓名/账号搜索与 10/25/50 每页切换。**退出组织必须二次确认**，弹窗用 `variant="danger" button--danger` 红色按钮，并明确提示失去访问权限、需管理员重新邀请。创建者的 `MoreHorizontal` 三点按钮放在**卡片底部操作区最右侧**（`Dropdown.Popover placement="top end"` 向上弹出），仅创建者可见「注销组织」，注销中切换为「注销恢复」；两种状态必须共用**同一个 `Dropdown.Item id`**（如 `workspace-deletion`），只改文案与图标，切换 id 会触发 HeroUI 报错并白屏。**更多菜单用标准点击触发**，与用户管理/组织树列表行的「更多操作」一致：`Dropdown` 非受控（不传 `isOpen`/`onOpenChange`），`Dropdown.Trigger` 点击开合，`Dropdown.Popover placement="top end"` 向上弹出，不挂任何 hover 事件。不要把注销菜单改成 hover 移入显示/移出隐藏——portal 弹层与按钮间有间隙，需要定时器延迟关闭，交互反而别扭且不易点中。
- **组织创建/邀请（接受制）**：创建表单沿用基本信息字段 + Logo 字段（Logo 当前仅存储、界面用默认图标），创建者自动成为 `owner` 并切换进入 `/dashboard`。邀请一律生成 `pending` 邀请（无论账号是否已注册），**对方必须在个人中心「消息待办」点击接受后才成为成员并进入工作台**；未接受前该组织不会出现在成员的"我的组织"卡片里。邀请状态包含 `pending / accepted / expired`（拒绝以 `expired` 落库，避免改线上枚举约束）；拒绝走 `declineInvitation`，退出走 `leaveWorkspace`（创建者不可退出），退出或拒绝后管理员可再次邀请——服务端复用历史邀请记录重置为 `pending`，不产生重复数据。服务端 `readSnapshot` 会按当前账号邮箱/手机号额外返回"发给我的"邀请及其组织基本信息，保证尚未加入组织也能在待办中看到邀请；普通账号的成员关系查询仍只覆盖自己所属组织，避免信息越权。前端对应 `useIncomingInvitations` / `acceptInvitation` / `declineInvitation` / `leaveWorkspace`。
- **用户管理数据源**：`src/pages/users.tsx` 由 `useWorkspaceMembers(workspaceId)` 派生真实成员（不再用 `initialUsers`）；编辑只改组织内角色/部门（部门来自组织树节点），账号资料在个人中心改；"所在部门"默认取示例组织树节点，接入真实租户组织树后替换候选源。
- **个人中心成员管理清单**：入口在选中组织卡片底部操作区（仅 `owner/admin`），Modal 内成员数据由 `tenant.memberships` + `tenant.accounts` 按 `effectiveId` 派生（含创建者本人），视图模型字段为 `name / account(email||phone) / workspaceRole / userRole / joinedAt`。**踢出成员**调用 `tenantActions.removeMembership(membershipId)`，必须二次确认（`variant="danger" button--danger` 红色按钮 + `TriangleAlert` 警告 + 提示失去访问权限、需重新邀请）。**创建者（`owner`）与当前登录者自己不可踢出**：踢出图标 `isDisabled`，且角色列对创建者标注「（不可移出）」、对自己标注「你」。成员角色不可在个人中心直接修改，提示去用户管理调整。
- **超级管理员后台**（`/admin`）：`SuperAdminGuard` 仅 `isSuperAdmin` 可进；顶层三组 Tab：全部账号 / 全部组织 / 成员关系，含统计条（新增「待处理注销」）与搜索。**「注销申请」不是顶层 Tab**，而是「全部组织」面板内的子标签页（`.admin-subtabs`，蓝色文字链接式、选中态下划线，非灰底胶囊轨道），子标签为「全部组织 / 注销申请」。超管账号受保护不可申请注销；原有手动注销普通账号 = `deactivateAccount`（清空其创建的组织、成员关系、邀请，账号置 disabled + 密码清空），二次确认。
- **组织注销（冷静期）**：创建者从卡片三点菜单申请，必须填写原因；弹窗说明 15 天冷静期、数据删除不可恢复，并用红色确认按钮。申请后组织状态写入 `deletionRequestedAt/Reason/ExpiresAt/RequestedBy`，卡片显示「注销中 · N 天」且所有人无法进入（清掉当前 `workspaceId`，`WorkspaceGuard` 重定向 `/profile`，服务端冻结该组织所有写入）。创建者可在同一菜单「注销恢复」；超管在 `/admin` 注销申请中点「同意注销」后立即删除组织及成员/邀请/组织树；15 天内未处理则由 `processDueDeletions` 在任意读取/写入前惰性自动执行。
- **账户注销（冷静期）**：账户安全页新增「注销账户」危险卡片，流程与组织注销一致：填写原因 → 15 天冷静期 → 创建者/账号本人可恢复 → 超管同意或到期执行。冷静期账号状态为 `pending-deletion`，仍可登录个人中心恢复，但 `workspaceId` 强制为 `null`、无法进入任何组织；执行后账号 `disabled` + 密码清空，并清理其创建的组织与成员/邀请。超管账号受保护。
- **注销申请后台**：`/admin` →「全部组织」→「注销申请」子标签页分组织与账户两张表，展示申请人、注销原因、申请日、剩余天数与「同意注销」红色按钮；确认弹窗强调不可撤销。自动到期与手动同意最终调用同一清理逻辑，避免状态漂移。
- **导航可见性**：侧栏「系统」组与头像菜单的"系统管理后台"入口均由 `user.isSuperAdmin` 动态渲染，普通账号不可见。

---

### 5.10 子系统切换（顶部入口）

平台支持多子系统并行，入口在浮动控件行左侧（菜单/Logo 之后、搜索胶囊之前），**不新增任何固定顶部栏**。

- **注册表**：`app-shell.tsx` 的 `SUBSYSTEMS` 是唯一数据源，当前含 `Cyanos 工作台`（`/dashboard`）、`风险分级管控`（`/subsystems/risk`）、`智能巡检`（`/subsystems/inspection`）。每项含 `id / title / description / path / icon`；新增子系统只需在此注册并添加对应路由，不改入口 UI。
- **入口按钮**：玻璃药丸 `glass rounded-full h-10`，内含 24px 品牌渐变图标 + 当前子系统标题（`lg` 以上显示）+ `ChevronDown`；点击打开全量弹窗。当前子系统由 `location.pathname` 派生，无需额外 state。窄屏只显示图标，避免挤压搜索胶囊。
- **全量弹窗**：HeroUI `Modal`，`sm:max-w-3xl`，标题「切换子系统」；`sm:grid-cols-3` 网格展示全部子系统卡片（品牌渐变 tile + 标题 + 描述 + 当前 `Chip` + 右上角箭头），点击卡片 `navigate(path)` 并关闭。卡片复用 `.neon-card`，hover 只用边框 + 光晕，**无位移**。
- **占位页**：`src/pages/subsystem.tsx` 是统一骨架（`PageHeader` + 大号 `neon-card` 空状态 + 「返回工作台」按钮）。当前仅智能巡检使用占位；风险分级管控已实现完整模块（见 §5.11），不要在切换器里堆功能入口。进入风险子系统后，侧栏首组自动变为「风险分级管控」，五个功能页作为二级导航，内容区不再重复提供模块切换条。
- **反模式**：入口不要做成 fixed/sticky 顶部栏；子系统不要写死在弹窗 JSX 里；占位页不要留空白无反馈。

### 5.11 风险分级管控子系统（双重预防机制）

参考企业安全管理平台「双重预防机制」复刻，入口为顶部子系统切换器的「风险分级管控」；进入后侧栏首组即「风险分级管控」，五个功能页以二级导航呈现。

- **数据层级**：风险分析对象（设备/设施/场所/区域）→ 风险分析单元（排查最小单元）→ 风险事件（评价等级）→ 管控措施（三级分类）+ 评价历史。**对象→单元→事件→措施为一对多级联**，删除父级必须级联清理子级与关联评价。
- **五个页面**（`src/pages/risk/`）：总览 `overview`（统计卡 + 红橙黄蓝分布 + 对象→单元→事件→措施树状整合）、对象 `objects`、单元 `units`、事件 `events`、措施 `measures`。`RISK_NAV`（`risk-shared.tsx`）是唯一功能页注册表，同时供侧栏一级「风险分级管控」使用；**内容区不再放模块导航条**。五个页面共用 `RiskShell` / `RiskLevelBadge` / `StatCard`。
- **二维码标签**：单元排查方式为二维码时，保存后生成 `qrPayload`（`{origin}/subsystems/risk/units/{id}`），列表点击二维码图标弹出可打印白底标签（qrcode 库生成 PNG，含单元名/所属对象/编码），支持下载；NFC 方式绑定卡编号字段，人员定位仅记录方式。
- **评价算法**（`risk-types.ts` 为唯一数据源）：LS `D=L×S`（≥20 红/15-19 橙/9-14 黄/<9 蓝）、LEC `D=L×E×C`（≥320/160/70）、MES `D=M×E×S`（≥18/12/6），直接判定手动选等级。参数由 `evalParams` 驱动表单动态渲染，**实时显示计算值与等级**；每次保存覆盖最新评价并保留完整历史（含有效期、评价人）。
- **管控措施三级分类**：分类1/2 取「管控措施分类目录」字典中国标大类/子类（parentId 为字典项 id），分类3 为用户自定义下级；编辑时切换一级/二级自动清空下级，避免悬挂关联。
- **数据层**：`risk-store.ts` 双模式——本地 `localStorage` 按租户 key 隔离（`cyanos-risk-v1:{tenantId}`），线上走 `/api/risk?workspaceId=`（Neon `risk_data` 表，单租户单 JSONB 快照，`api/risk.ts` 校验成员身份）。写少读多、整包提交，避免多表事务。
- **字典来源**：风险对象类型 / 危险源等级 / 排查方式 / 评价方法 / 风险等级 / 事故类型 / 管控措施分类目录均为 `data-dictionary` 中的内置字典组（`RISK_*`、`HAZARD_LEVEL`、`INSPECTION_METHOD`、`EVAL_METHOD`、`ACCIDENT_TYPE`、`CONTROL_CATEGORY`），由 `useDictOptions` / `useDictLabels` 派生，**禁止在业务组件里硬编码这些选项**。
- **视觉**：沿用平台 neon-card / Table `variant="secondary"` / 轻量受控字段 `risk-fields.tsx`（`Field`/`SelectField`/`TextAreaField`），HeroUI v3 的 compound 组件（TextField/Select 的 `selectedKeys`、Button 的 `color`）不适用，按现有页面用法统一。

## 6. 排版规范

- 字体栈：`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`；开启 `-webkit-font-smoothing: antialiased`。
- 页面标题 `text-2xl sm:text-[28px] font-bold tracking-tight`；副描述 `text-sm text-muted`。
- 统计数值 `text-[28px] font-bold leading-none tracking-tight`；统计标签 `text-sm text-muted`。
- 分组标签 / 小标题：`text-[11px] font-semibold tracking-[0.16em] uppercase text-muted`。
- 辅助信息：`text-xs` 或 `text-[11px] text-muted`。
- 品牌字标：`19px font-bold tracking-tight` + 副标 `10px tracking-[0.18em] uppercase`。
- 正文颜色只用 `text-foreground` / `text-muted`，不要写 `text-gray-500` 这类原子色。

---

## 7. 圆角、间距与图标

- 圆角：令牌 `--radius: 0.8rem`、字段 `--field-radius: 1.12rem`；卡片 `rounded-2xl`，图标容器 `rounded-xl`，胶囊/头像/圆形按钮 `rounded-full`。
- 间距：卡片内边距 `p-5`/`p-6`；卡片间 `gap-4`/`gap-5`；区块间隔 `mt-5`/`mb-6`/`mb-7`。
- 图标统一 `lucide-react`，常用尺寸 `size-4`（行内）、`size-[18px]`（导航/控件）、`size-5`（标题/统计）。
- 微信 / 钉钉图标为自绘 SVG，位于 `src/components/social-icons.tsx`，**不要替换为 emoji 或第三方图片**。

---

## 8. HeroUI v3 组件用法（务必遵守，v2 写法会报错）

```tsx
// 表单：TextField 复合结构 + InputGroup（不是 startContent / endContent）
<TextField name="email" type="email" isRequired className="w-full">
  <Label>企业邮箱</Label>
  <InputGroup>
    <InputGroup.Prefix><Mail className="text-muted size-4" /></InputGroup.Prefix>
    <InputGroup.Input placeholder="name@company.com" />
  </InputGroup>
</TextField>

// 按钮：isPending + 函数子元素（不是 isLoading）
<Button variant="primary" size="lg" isPending={loading}>
  {({ isPending }) => <>{isPending ? <Spinner size="sm" color="current" /> : <ArrowRight className="size-4" />}{isPending ? "登录中…" : "登录"}</>}
</Button>

// 下拉：placement 放在 Dropdown.Popover 上，不是 Dropdown
// 【关键】触发器必须用 <Dropdown.Trigger>（自定义元素）或 HeroUI <Button>，
// 绝不能是裸的原生 <button>——否则 press 事件注入不了，点击只会有 hover 而无菜单弹出。
<Dropdown>
  <Dropdown.Trigger className="flex cursor-pointer items-center gap-2 rounded-full">
    <Avatar>...</Avatar>
  </Dropdown.Trigger>
  <Dropdown.Popover placement="bottom end">
    <Dropdown.Menu aria-label="用户菜单">
      <Dropdown.Item id="profile" textValue="个人中心" onAction={go}>个人中心</Dropdown.Item>
      <Dropdown.Item id="logout" textValue="退出" variant="danger" onAction={out}>退出</Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown.Popover>
</Dropdown>

// 头像：颜色写在 Avatar.Fallback 的 style 上（写 Avatar 上不生效）
<Avatar className="size-9">
  <Avatar.Fallback className="text-white" style={{ background: color }}>{name.slice(0, 1)}</Avatar.Fallback>
</Avatar>

// 卡片：Card.Header / Card.Title / Card.Description / Card.Content
<Card className="neon-card rounded-2xl">
  <Card.Header><Card.Title>增长趋势</Card.Title><Card.Description>...</Card.Description></Card.Header>
  <Card.Content>...</Card.Content>
</Card>

// Chip：soft 变体
<Chip color="accent" size="sm" variant="soft">管理员</Chip>

// Checkbox：复合结构
<Checkbox name="remember" defaultSelected>
  <Checkbox.Content><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><span>记住我</span></Checkbox.Content>
</Checkbox>
```

- 交互回调优先用 `onPress`（HeroUI 组件）；原生 `<button>` 用 `onClick`。
- **Dropdown 触发器硬性要求**：`<Dropdown>` 的直接子元素必须是 `<Dropdown.Trigger>`（包裹自定义元素如头像、div）或 HeroUI `<Button>`。**禁止用裸原生 `<button>`**——HeroUI v3 基于 React Aria，只对上述两种触发器注入 press/isOpen 等状态；裸 `<button>` 会导致下拉永远打不开（点击仅有 CSS hover 光圈，无任何功能响应）。参考实现：`app-shell.tsx` 的用户头像菜单、`users.tsx` 的操作列。
- **Tooltip 触发器硬性要求**：非 HeroUI 原生元素（`<a>`/NavLink/`<button>`/`<div>`）作触发器时，必须用 `<Tooltip.Trigger>` 包裹；`placement` / `showArrow` / `offset` 写在 `<Tooltip.Content>` 上。且 Trigger 内子元素用普通元素，**禁止函数式 children**（会导致事件/ref 关联失效、Tooltip 不显示；激活态改用 `useLocation()` 计算）。同 Dropdown 的 React Aria 坑。参考实现：`app-shell.tsx` 的折叠开关 Tooltip。
- 按钮变体只用 `primary`（主操作）、`outline`（次级/快捷登录）、`ghost`（图标/文字操作）。主按钮一律 `variant="primary"`，需要强霓虹感时叠加 `.button--primary`。
- **不要**引入 `HeroUIProvider`、`tailwind.config.js` 插件、v2 的 `nextui` 包名——v3 不需要。
- 路由跳转用 `react-router-dom` 的 `NavLink` / `useNavigate`。

---

## 9. 认证与 toB 渠道

- 登录页左侧为 `lg:w-[46%]` 的全屏紫→蓝→绿渐变营销区，含 3 个漂浮光斑；右侧为表单区，最大宽 `400px`。
- 快捷登录**只用国内企业渠道**：微信登录（`WechatIcon` + `text-[var(--brand-green-deep)]`）、钉钉登录（`DingTalkIcon` + `text-sky-500`）。
- **禁止**出现 Google / GitHub / Apple 等海外渠道。
- 注册页保持同样的渠道与视觉。
- 演示模式：任意有效邮箱 + 6 位以上密码，或直接点击微信/钉钉快捷登录。

---

## 10. 文件索引（职责边界）

| 文件 | 职责 |
|------|------|
| `src/styles/globals.css` | **视觉真源**：色板、语义 token、画布渐变、发光、动画、滚动条 |
| `src/components/brand.tsx` | Logo（`BrandMark`）与品牌字标（`Brand`） |
| `src/components/app-shell.tsx` | 应用外壳：互斥抽屉导航（弱样式一级 + 图标二级功能页）、玻璃侧栏、浮动控件、移动抽屉、用户菜单 |
| `src/components/ui.tsx` | 共享件：`PageHeader` / `StatCard` / `RoleChip` / `StatusChip` / `UserAvatar` |
| `src/pages/organizations.tsx` | 组织管理：组织树 + 基本信息查看/编辑 + 新增/改名/删除（唯一实现处） |
| `src/pages/dictionaries.tsx` | 数据字典：分类与多级字典项管理（唯一实现处） |
| `src/pages/admin.tsx` | 超管后台：全账号/组织/成员总览 + 注销申请审批与手动注销账号（仅 `isSuperAdmin`） |
| `src/lib/dict-store.ts` | 字典共享数据源：localStorage 持久化、跨组件/跨标签同步、`useOrgTypeOptions` / `useRootOrgTypeOptions` / `useOrgTypeLabels` / `useOrgTopTypes` |
| `src/lib/tenant-store.ts` | 多租户数据层：账号/工作空间/成员/邀请/会话/验证码，`useTenantStore` + `tenantActions`（唯一实现处） |
| `src/provider.tsx` | 认证上下文：基于 tenant-store 的 login/register/logout/switchWorkspace |
| `api/`（`auth.ts` / `state.ts` / `mutations.ts` / `_lib/`） | Vercel Serverless Functions：认证、快照、写操作，连接 Neon（真后端唯一实现处） |
| `database/schema.sql` | Neon Postgres 建表（主键用前端字符串 ID，含 `verification_codes`） |
| `scripts/seed-admin.mjs` | `npm run seed` 生成预置账号（wechat@cyanos.cn / CyanAdmin）的可执行 INSERT SQL |
| `vercel.json` / `.env.example` | Vercel SPA 回退 + `/api` 放行；环境变量模板（`DATABASE_URL` / `JWT_SECRET` / `VITE_API_BASE`） |
| `src/lib/types.ts` | 用户、组织、字典与多租户的数据模型、类型标签 |
| `src/lib/mock-data.ts` | 组织架构与字典演示数据（`initialOrganizations` / `initialDictGroups` / `initialDictEntries`） |
| `src/components/social-icons.tsx` | 微信 / 钉钉 SVG 图标 |
| `src/lib/use-theme.ts` | 主题切换：写 `data-theme` + `.dark` class + localStorage |
| `src/pages/subsystem.tsx` | 子系统占位页统一骨架（当前仅智能巡检使用） |
| `src/pages/risk/` | 风险分级管控五页：总览 / 对象 / 单元 / 事件 / 措施 + `risk-shared` / `risk-fields`；`RISK_NAV` 同时驱动侧栏二级 |
| `src/lib/risk-types.ts` | 风险模块类型、标签、LS/LEC/MES 评价算法与参数的唯一数据源 |
| `src/lib/risk-store.ts` | 风险数据双模式存储层（本地 localStorage / 线上 /api/risk） |
| `api/risk.ts` + `database/schema.sql` | 风险数据真后端：`risk_data` 表（租户级 JSONB 快照）+ 成员身份校验 |
| `src/pages/*.tsx` | 页面实现，只消费上述规范，不重复定义视觉 |

路由：`/login`、`/register`、`/dashboard`、`/users`、`/organizations`、`/roles`、`/dictionaries`、`/subsystems/risk`（总览）、`/subsystems/risk/objects`、`/subsystems/risk/units`、`/subsystems/risk/events`、`/subsystems/risk/measures`、`/subsystems/inspection`、`/profile`、`/admin`。`/settings` 已废弃，重定向到 `/profile`。个人中心上部为组织管理（列表/切换/创建/邀请），下部四个 Tab：个人资料 / 账户安全 / 通知设置 / 偏好设置。守卫：`WorkspaceGuard`（无工作空间→`/profile`）、`SuperAdminGuard`（非超管→`/dashboard`）。

---

## 11. 新增页面 Checklist（每次提交前逐项核对）

- [ ] 页面根容器带 `.app-canvas`（或置于已带该类的 `AppShell` 内），**没有顶部导航栏**。
- [ ] 所有卡片容器带 `.neon-card`；主按钮用 `variant="primary"`，需要发光叠加 `.button--primary`。
- [ ] 颜色只用本文列出的 token；绿色强调用 `--brand-green-strong`，不写 hex。
- [ ] 通过 `text-foreground` / `text-muted` 设文字色，不写原子灰。
- [ ] HeroUI 组件用 v3 复合 API：`InputGroup`、`isPending`、`Dropdown.Popover` 等。
- [ ] 图标来自 `lucide-react`；品牌渠道图标复用 `social-icons.tsx`。
- [ ] 标题栏用 `PageHeader`，统计卡用 `StatCard`，角色/状态标签用 `RoleChip` / `StatusChip`。
- [ ] 有明确的响应式断点表现（`sm` / `lg` / `xl`）。
- [ ] 组织管理页遵循 §5.7：组织类型与顶部统计卡全部由 `ORG_TYPE` 字典驱动（含新增类别），基本信息默认查看态，树操作可新增/改名/删除，不含"部门岗位"，面板高度绑定视口。
- [ ] 侧栏遵循 §5.6：一级只做文字 + 横线的弱样式，二级用 44px 图标 tile；同一时刻只展开一个分组（hover 切换 + 路由回落），收起组留激活标记；上下滑动用 `.nav-drawer`；展开/收缩 tile 统一 44px、图标 20px，hover 无 transform 位移；收缩态底部分隔线已移除；进入风险子系统后首组为「风险分级管控」。
- [ ] 子系统切换遵循 §5.10：入口在浮动控件行，全量弹窗由 `SUBSYSTEMS` 注册表驱动，占位页有明确反馈。
- [ ] 风险分级管控遵循 §5.11：四级层级级联删除、二维码可打印、评价自动算级并留历史、三级分类联动；选项全部走字典，不硬编码；导航由 `RISK_NAV` 统一驱动，内容区无重复模块导航。
- [ ] 数据字典页遵循 §5.8：分类与多级字典项均可增删改，内置项不可删，字典项支持启停/排序，组织类别字典改动能实时反映到组织页。
- [ ] **亮色与暗色主题都实测过**：暗色必须是深紫蓝底 + 更亮的紫绿霓虹，不是纯黑白线。
- [ ] `npm run build` 通过，无未定义 CSS 变量、无未使用导入。

---

## 12. 反模式（禁止写法对照）

| ❌ 禁止 | ✅ 正确 |
|---------|---------|
| sticky / fixed 顶部导航栏 | 浮动控件直接落在画布上 |
| 展开/收缩改变 tile 或图标尺寸（跳跃感） | 统一 44px tile / 20px 图标，只收窄容器与隐藏文字 |
| 展开项发光竖条被裁 / 透明子项仍可点击 | `aside` 不加 `overflow-hidden`；`nav` 可 `overflow-y-auto table-scroll` 自行滚动；收起态加 `pointer-events-none` |
| 一级标签也用图标 tile，与二级功能页主次混淆 | 一级只有文字 + 横分割线的弱样式，图标 tile 只留给二级功能页 |
| 一级文字右侧拖一条短横线，像尾巴、重心不稳 | 文字在上、完整细线在下（`mt-1.5 h-px w-full`），像分栏标题 |
| 同时展开多个分组 / hover 切换时位置跳动 | 单一 `hoveredGroup` 裁决，同一时刻只展开一组；`.nav-drawer` 用 grid-rows 平滑滑动 |
| 收缩态用右侧 flyout / 横移闪退 | 收缩态同样竖排图标 tile + 互斥抽屉，无浮层，无需桥接间隙 |
| 一级/二级套 Tooltip 与抽屉内容重叠 | 一级本身有文字、二级收缩态图标直接可见；只有折叠开关保留 Tooltip |
| 内容区再放一排模块切换条，与侧栏重复导航 | 功能页全部收进侧栏一级「风险分级管控」下的二级，`RISK_NAV` 为唯一数据源 |
| 收缩态底部 `border-t` 只剩一小截像多余的"条" | 展开态保留分隔线，收缩态去掉 `border-t` |
| 子系统入口做成 fixed 顶部栏 / 卡片写死在弹窗 JSX | 浮动控件行药丸入口 + `SUBSYSTEMS` 注册表 + Modal 网格 |
| 风险模块业务组件里硬编码对象类型/风险等级等选项 | 全部用 `useDictOptions` 从字典派生，与平台数据字典唯一数据源保持一致 |
| 删除风险对象/单元/事件时只删当前层级留孤儿数据 | 按 `对象→单元→事件→评价/措施` 级联清理，用 id Set 一次性计算 |
| 评价等级用固定值或只在 UI 显示不落库 | `evaluateRisk` 统一算法，结果写入 `evaluations` 并缓存到事件 `currentLevel` |
| `#000` 纯黑背景、白色描边卡片 | `oklch(0.135 0.022 285)` 深紫蓝底 + 半透明玻璃卡 |
| 硬编码 `#a855f7` / `#22c55e` | `--brand-purple` / `--brand-green-strong` |
| 普通白底卡片 | `.neon-card` |
| HeroUI v2 的 `isLoading` / `startContent` | v3 的 `isPending` / `InputGroup` |
| `placement` 写在 `<Dropdown>` 上 | 写在 `<Dropdown.Popover>` 上 |
| 裸原生 `<button>` 当 Dropdown 触发器（点击无反应） | `<Dropdown.Trigger>` 或 HeroUI `<Button>` |
| 裸 `<a>`/`<button>` 当 Tooltip 触发器、或 Trigger 内用函数式 children | `<Tooltip.Trigger>` 包裹 + 普通 children |
| 侧栏放升级/广告卡片占空间 | 侧栏只放导航 + 底部折叠开关 |
| 收起态用裸图标 / 汉堡 `Menu` 三线 | 方形 tile 图标（`bg-default/60`）+ `PanelLeft` 图标 |
| 折叠开关沿用灰色导航 tile、无色彩 | `.sidebar-toggle-tile`：紫绿渐变底 + 彩色图标 + hover 实心渐变光晕 |
| 收缩 rail 留大片空白 / 主区再加 padding 形成双层间距 | rail `w-[68px]` + `px-1` / `p-1` 贴合 44px tile，主区 `lg:pl-[80px]` 零额外缝隙 |
| 有侧栏时宽屏用 `mx-auto` 居中内容，侧栏与内容间出现巨大空档 | 有侧栏时 `mr-auto w-full max-w-[1920px]` 左对齐，内容紧贴侧栏右侧铺开；无侧栏时用 `mx-auto max-w-[1680px]` 居中自适应 |
| 组织树高度随节点数量增长 / 内容增减撑高页面 | `.org-workspace` 视口高度 + `.org-panel__body` 内部滚动，flex 祖先全部 `min-height: 0` |
| 组织类型写死在页面常量 / 用 `CHILD_ORG_TYPES` 等白名单过滤下拉 / 按父节点类型收窄 | 下级下拉直接用 `useOrgTypeOptions`（全部启用项），根级用 `useRootOrgTypeOptions`（`allowRoot`）；名称用 `useOrgTypeLabels`，新增字典项自动可用 |
| 字典项只能平铺 / 各自维护一份字典副本 | `DictEntry.parentId` 多级树 + `dict-store.ts` 共享数据源与 localStorage 同步 |
| 编辑字典项漏提交 `parentId` / 层级表单可手填 / 上移下移只交换 sort | 编辑连同 `parentId` 一起提交让节点真正移动；层级由上级派生只读；`reorderSiblings` 整体重排规范化 sort |
| 组织顶部统计卡写死五类 / 新增字典类别不显示 / 新类型 undefined 白屏 | 顶部卡走 `useOrgTopTypes`（启用 + `showInTop` + 最多 6 个），字典页 Pin 开关控制；`getMeta` 兜底新类型图标色彩 |
| 新增字典类别后顶部卡出现、创建组织下拉却没有 | 所有组织类型下拉与顶部卡同源字典；下拉禁止再套类型常量 `.filter()`，根级范围用字典项 `allowRoot` 配置 |
| 用 `scaleX` 或父级百分比做搜索框展开（文字变形 / 动画失效） | `.canvas-search` 的 `focus-within` 直接过渡 `width` 300→600px |
| hover 用 `transform: translateY(-1px)` 做浮起（鼠标在元素边缘反复进出、跳来跳去） | 改用 box-shadow + border-color 表达浮起，元素几何位置保持不变；`:active` 也不做反向位移 |
| 搜索条/侧栏无 hover 反馈（悬浮时无边界感） | `.canvas-search:hover` 与 `.sidebar-rail:hover` 补紫色描边 + 柔和光晕，与 `.neon-card` 同一套语言 |
| 头像颜色写在 `<Avatar style>` | 写在 `<Avatar.Fallback style>` |
| 无组织时仍渲染侧栏导航 / 内容留出侧栏空 padding / 内容偏左右侧大片空白 | 无组织态隐藏侧栏，仅左上角保留 `<Brand />`，主区 `mx-auto max-w-[1680px]` 居中自适应 |
| 邀请后直接写入 membership / 退出后无法重邀 | 一律 pending 邀请 + 待办接受制；退出/拒绝后可重置邀请重发 |
| 组织卡片下方再放长条成员卡 / 选中卡片被按钮撑高 / 卡片与待办紧贴 / 待办重复放工作台入口 | 等高卡片 + 选中态底部独立操作区；待办卡 `mt-6` 且只处理邀请 |
| 成员管理列表另起一套表格样式 / 踢出成员无二次确认 / 能踢出创建者或自己 | 复用用户管理同款 `variant="secondary"` 表格 + 三栏分页；踢出走 danger 红色按钮确认弹窗；创建者与本人禁用踢出 |
| 选中卡片画顶部渐变横线 / 更多按钮放右上角 | 只用描边 + 外发光表达选中；更多按钮放底部操作区最右侧并向上弹出 |
| 切换 `Dropdown.Item` 的 `id`（如 delete ↔ restore） | 固定同一个 id，只改文案/图标，否则 HeroUI 抛错导致白屏 |
| 把组织卡片注销菜单改成 hover 显示/移出隐藏（定时器方案） | 与列表行统一用点击触发：非受控 `Dropdown` + `Dropdown.Trigger`，不挂 hover 事件，无需定时器 |
| HeroUI `Table` 不标行头 / 数据更新后白屏 | 每张表的首个 `Table.Column` 必须加 `isRowHeader` |
| 表格用默认 `variant="primary"` / 只把 `.table-root` 圆角清零 | 表头直角、数据行白卡大圆角、外层卡片圆角三层叠加（"内外圆角反了"）；一律 `variant="secondary"` + 覆盖表头首末列圆角，圆角只留外层卡片一层 |
| 退出组织或注销直接执行 / 用普通主色按钮承载危险操作 | 必须二次确认 + `variant="danger" button--danger` 红色按钮 |
| 申请人一提交就删除组织或账号 / 没有任何恢复窗口 | 一律 15 天冷静期 + 申请人可恢复 + 超管同意或到期自动执行 |
| 注销中的组织仍可进入 / 普通成员看不到注销状态 | 卡片保留并显示倒计时，所有入口与服务端写入冻结；`workspaceId` 清空 |
| 超管后台内容被个人中心的 `max-w-[1680px]` 限制，宽屏左右留白、标签轨道两端出现滚动箭头残片 | `/admin` 路由用 `mx-auto max-w-none` 铺满；隐藏标签轨道的 `Scroll tabs left/right` 按钮 |
| 「注销申请」与账号/组织/成员平级作为顶层 Tab | 顶层只保留 3 个胶囊 Tab；「注销申请」作为「全部组织」面板内的蓝色文字链接式子标签（`.admin-subtabs`，选中态下划线） |
| Vercel Serverless 的 TS API 相对导入不写扩展名（`./_lib/db`）| 线上编译成 ESM 后 Node 报 `ERR_MODULE_NOT_FOUND`，登录等接口全 500；所有相对导入必须写 `.js`（`./_lib/db.js`、`./_lib/auth.js`），`import type` 可省略 |
| Google / GitHub 登录 | 微信 / 钉钉登录 |
| 自定义新发光色值 | 复用 `--glow-purple` / `--glow-green` |

---

## 13. 已知遗留（后续迭代可清理，勿误认为规范）

- `src/lib/use-theme.ts` 的 localStorage key 仍为历史值 `aura-theme`（不影响视觉；若统一品牌可改 `cyanos-theme`）。
- `src/config/site.ts` 仍是 HeroUI 模板默认内容（`"Vite + HeroUI"`），目前未被页面引用；新增导航时不要依赖它，直接维护 `app-shell.tsx` 的 `navGroups`。
- 图表分类色 `#f59e0b`（琥珀）为零星硬编码，属图表配色例外；若后续引入完整图表库，建议沉淀为 token。
- `src/pages/index.tsx`、`about.tsx`、`blog.tsx`、`docs.tsx`、`pricing.tsx` 等为脚手架残留页面，未挂到主路由，可安全忽略或清理。

---

## 14. 线上部署（当前实例）

- **生产地址**：`https://cyanos.vercel.app`（Vercel 项目 `boottzs-projects-e279e231/cyanos`）。
- **数据层**：Neon Postgres；`DATABASE_URL`、`JWT_SECRET` 以 Vercel Secret 存在 Production，`VITE_API_BASE=/api` 以 Config 存在，前端构建时注入。
- **后端形态**：`api/auth.ts`、`api/state.ts`、`api/mutations.ts` 以 Vercel Serverless Functions 运行，`vercel.json` 保留 SPA 回退并让 `/api/*` 优先走函数。
- **访问保护**：项目 `ssoProtection` 已置空、`protectionBypass` 已撤销，生产域名可公开访问；后续新部署不要重新开启 SSO 保护，否则登录页会被 Vercel 登录墙拦截。
- **部署方式（2026-11-24 起）**：GitHub 仓库 `https://github.com/BooTTz/Cyanos`（public，`main` 分支）已通过 Vercel Git 集成关联到本项目。推送到 `main` 会自动触发生产部署，其他分支/PR 生成预览部署；本地不再需要 Vercel 登录、设备码或临时代理。只有修改环境变量、域名等项目配置时才需要 API 或 Dashboard。若需调用 Vercel REST API，注意 `api.vercel.com` 在本机不可直连，可用 `https://vercel.com/api/...` 作为等价路径。
- **预置账号**：`wechat@cyanos.cn` / `CyanOS1120`（普通用户），`CyanAdmin` / `CyanOS1120`（超管，`/admin`）。
- **密钥纪律**：含明文 Token/连接串的一次性 `deploy.sh` 已在部署成功后删除；不要重新提交含密钥的脚本或 `.env`。
- **注销功能迁移**：线上 Neon 已执行 `database/schema.sql` 中的注销字段 DDL：`accounts` 状态枚举扩展为 `active | pending-deletion | disabled`，并新增 `deletion_requested_at/reason/expires_at` 与 `workspaces` 对应字段；索引 `idx_*_deletion_expiry` 已建立。后续任何新环境都必须先执行该 schema 再部署，否则申请注销会因约束/缺列失败。
