// 生成 Cyanos 预置账号的可执行 SQL，粘贴到 Neon SQL Editor 执行即可。
// 用法：node scripts/seed-admin.mjs
// 预置：wechat@cyanos.cn（示例组织创建者）、CyanAdmin（超级管理员），口令均为 CyanOS1120。
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2] || "CyanOS1120";
const hash = (p) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
};

const ownerHash = hash(password);
const superHash = hash(password);

console.log(`-- 在 Neon SQL Editor 执行：建表（database/schema.sql）后运行本段种子数据
-- 预置账号口令：${password}（请在生产环境修改）
insert into accounts (id, email, phone, name, password_hash, avatar_color, bio, location, is_super_admin, status)
values
  ('ACC-OWNER', 'wechat@cyanos.cn', '13800000000', '林知夏', '${ownerHash}', 'oklch(0.62 0.24 292)', 'Cyanos 示例组织的创建者与管理负责人。', '中国 · 上海', false, 'active'),
  ('ACC-SUPER', 'CyanAdmin', null, '超级管理员', '${superHash}', 'oklch(0.65 0.2 25)', '平台超级管理员，可访问系统管理后台。', '中国 · 上海', true, 'active')
on conflict (id) do nothing;

insert into workspaces (id, name, code, type, logo, owner_id, description, phone, address, status)
values ('WS-DEFAULT', '华远智造科技有限公司', 'HY-ZZ', 'company', '', 'ACC-OWNER', '集团总部，统筹生产运营、安全管理与供应链协同。', '021-6688 1000', '上海市浦东新区张江路 88 号', 'active')
on conflict (id) do nothing;

insert into memberships (id, workspace_id, account_id, role, department_id, status)
values
  ('MEM-OWNER', 'WS-DEFAULT', 'ACC-OWNER', 'owner', 'O1000', 'active'),
  ('MEM-SUPER', 'WS-DEFAULT', 'ACC-SUPER', 'admin', null, 'active')
on conflict (workspace_id, account_id) do nothing;
`);
