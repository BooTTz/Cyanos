# Cyanos 部署到 Vercel + Neon（真后端）

前端为 Vite SPA，后端为 Vercel Serverless Functions，数据库为 Neon Postgres。
同一套代码：**本地跑 localStorage 演示版，部署后自动切换 /api 真后端**。

## 一、准备 Neon 数据库（1 分钟）

1. 打开 https://neon.tech 用 GitHub 注册，New Project（区域选离用户近的，如 Singapore）。
2. 项目 → SQL Editor，粘贴执行 `database/schema.sql` 的全部内容（建表）。
3. 本地生成预置账号 SQL：`npm run seed`，把输出整段粘贴到 SQL Editor 执行（创建 `wechat@cyanos.cn` 和 `CyanAdmin`，口令 `CyanOS1120`）。
4. 项目首页 **Connect** → Connection string，复制形如 `postgresql://neondb_owner:xxx@xxx.neon.tech/neondb?sslmode=require` 的串，**留着下一步用**（不要发到聊天/提交到 git）。

## 二、Vercel 环境变量

在 Vercel 项目 → Settings → Environment Variables 添加：

| 变量名 | 值 | 说明 |
|---|---|---|
| `DATABASE_URL` | 上一步的 Neon 连接串 | 服务端专用，前端拿不到 |
| `JWT_SECRET` | 随机长字符串（如 `openssl rand -hex 32` 生成） | 会话令牌签名密钥 |
| `VITE_API_BASE` | `/api` | **关键**：设置后前端才切换到真后端；留空则是 localStorage 版 |

> `VITE_API_BASE` 必须以 `VITE_` 开头才会注入前端。三个变量都对 Production / Preview / Development 全勾。

## 三、部署

两种方式任选：

- **CLI**：`npm i -g vercel` → `vercel login` → `vercel --prod`
- **Git**：把本项目推到 GitHub → Vercel → Add New → Import 该仓库 → Framework 选 Vite → Deploy

Vercel 自动识别 `api/*.ts` 为 Functions（`vercel.json` 已配置 SPA 回退且放行 `/api`）。

## 四、验证

1. 打开部署域名 → `/login`，用 `wechat@cyanos.cn` / `CyanOS1120` 登录 → 应看到真实组织。
2. `/register` 注册新账号 → 填写信息 → 获取验证码（页面展示 6 位码）→ 注册 → 跳个人中心显示"创建组织"引导。
3. 用 `CyanAdmin` / `CyanOS1120` 登录 → `/admin` 后台可见全部账号与组织，可注销普通账号。
4. 换一台设备/无痕窗口登录同一账号 → 数据一致（证明落到 Neon，而非浏览器本地）。

## 五、接口一览

- `POST /api/auth?action=send-code` —— 生成并暂存验证码（演示模式返回 code 供页面展示）
- `POST /api/auth?action=register|login|logout` —— 注册 / 登录 / 登出，返回 token + 数据快照
- `GET  /api/auth?action=me` —— token 换取当前账号与快照
- `GET  /api/state` —— 前端启动时拉取权威快照（按账号/超管隔离可见范围）
- `POST /api/mutations` —— 所有写操作（更新资料、建/加工作空间、邀请、成员管理、注销账号）

## 六、安全说明与后续

- 密码用 scrypt + 随机盐（服务端 `api/_lib/auth.ts`），前端不存口令。
- 会话是 HMAC 签名令牌；生产建议换成 httpOnly Cookie + jose/Auth.js。
- 验证码当前是本地演示（返回到页面）；接 Resend 时改为服务端发信并仅落库校验，不返回 code。
- 数据可见范围：`readSnapshot` 对普通账号只返回其所在工作空间的数据，超管返回全平台。
- 后续把组织树、数据字典落库时，沿用 `organizations` 表与 `mutations` 的 action 扩展即可。
