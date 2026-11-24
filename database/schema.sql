-- Cyanos 多租户数据库结构（PostgreSQL / Neon）
-- 在 Neon SQL Editor 中执行本文件即可建表。
-- 约定：主键直接使用前端生成的字符串 ID（如 ACC-xxx / WS-xxx），前后端 ID 一致，无需映射表。

create extension if not exists "pgcrypto";

-- 全局账号：一个账号可加入多个工作空间
create table if not exists accounts (
  id text primary key,
  email text unique,
  phone text unique,
  name text not null,
  password_hash text not null,
  avatar_color text,
  bio text default '',
  location text default '',
  is_super_admin boolean default false,
  status text default 'active' check (status in ('active', 'pending-deletion', 'disabled')),
  created_at date default current_date,
  last_active text default '刚刚'
);

-- 工作空间（租户）：用户注册后创建，创建者自动成为 owner
create table if not exists workspaces (
  id text primary key,
  name text not null,
  code text not null,
  type text not null default 'company',
  logo text default '',
  owner_id text references accounts(id),
  description text default '',
  phone text default '',
  address text default '',
  status text default 'active',
  created_at date default current_date
);

-- 成员关系：账号与工作空间多对多
create table if not exists memberships (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  account_id text references accounts(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  department_id text,
  status text default 'active' check (status in ('active', 'invited')),
  joined_at date default current_date,
  unique (workspace_id, account_id)
);

-- 邀请
create table if not exists invitations (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  email text not null,
  role text default 'member',
  token text unique not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'expired')),
  invited_by text references accounts(id),
  created_at date default current_date
);

-- 本地演示验证码（真实接 Resend 时改用邮件发送 + 服务端校验，可保留此表做校验）
create table if not exists verification_codes (
  target text primary key,
  code text not null,
  expires_at bigint not null
);

-- 组织树（工作空间内的组织架构节点），预留给后续租户级组织数据落库
create table if not exists organizations (
  id text primary key,
  tenant_id text references workspaces(id) on delete cascade,
  parent_id text,
  name text not null,
  type text not null,
  code text,
  leader text,
  phone text,
  address text,
  status text default 'active',
  created_at date,
  description text
);

create index if not exists idx_memberships_account on memberships(account_id);
create index if not exists idx_memberships_workspace on memberships(workspace_id);

-- 注销冷静期（15 天）：以下 alter 可重复执行，用于升级已有数据库。
-- 申请后状态变为 pending-deletion / 组织保留但冻结写入；超管同意或到期后执行注销。
alter table accounts drop constraint if exists accounts_status_check;
alter table accounts add constraint accounts_status_check
  check (status in ('active', 'pending-deletion', 'disabled'));

alter table accounts
  add column if not exists deletion_requested_at date,
  add column if not exists deletion_reason text default '',
  add column if not exists deletion_expires_at date;

alter table workspaces
  add column if not exists deletion_requested_at date,
  add column if not exists deletion_reason text default '',
  add column if not exists deletion_expires_at date,
  add column if not exists deletion_requested_by text;

create index if not exists idx_workspaces_deletion_expiry on workspaces(deletion_expires_at);
create index if not exists idx_accounts_deletion_expiry on accounts(deletion_expires_at);
