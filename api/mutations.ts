import { getSql, json, fail, readSnapshot, errorResponse, processDueDeletions } from "./_lib/db.js";
import { getBearer } from "./_lib/auth.js";

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** POST /api/mutations —— 所有写操作统一入口，执行后返回最新快照 */
export async function POST(request: Request) {
  const auth = getBearer(request);
  if (!auth) return fail("未登录", 401);
  const accountId = String(auth.accountId);
  const isSuperAdmin = !!auth.isSuperAdmin;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const p = body.payload || {};

  try {
    const sql = getSql();
    await processDueDeletions(sql);

    // 注销冷静期内的组织保留数据但冻结所有写入，避免成员继续操作
    const targetWorkspaceId = String(p.workspaceId || p.invitation?.workspaceId || p.membership?.workspaceId || "");
    if (
      targetWorkspaceId &&
      !["requestWorkspaceDeletion", "cancelWorkspaceDeletion", "approveWorkspaceDeletion"].includes(action)
    ) {
      const ws = await sql`select deletion_expires_at from workspaces where id = ${targetWorkspaceId}`;
      if (ws[0]?.deletion_expires_at) return fail("组织注销中，暂不可操作");
    }

    switch (action) {
      case "updateAccount": {
        const patch = p.patch || {};
        const name = patch.name;
        const email = patch.email;
        const phone = patch.phone;
        const bio = patch.bio;
        const location = patch.location;
        const avatar = patch.avatarColor ?? patch.avatar_color;
        if (name !== undefined) await sql`update accounts set name = ${name} where id = ${accountId}`;
        if (email !== undefined) await sql`update accounts set email = ${email || null} where id = ${accountId}`;
        if (phone !== undefined) await sql`update accounts set phone = ${phone || null} where id = ${accountId}`;
        if (bio !== undefined) await sql`update accounts set bio = ${bio} where id = ${accountId}`;
        if (location !== undefined) await sql`update accounts set location = ${location} where id = ${accountId}`;
        if (avatar !== undefined) await sql`update accounts set avatar_color = ${avatar} where id = ${accountId}`;
        break;
      }

      case "switchWorkspace": {
        // 会话级选择，仅前端保存；预留服务端记住上次工作空间
        break;
      }

      case "createWorkspace": {
        const w = p.workspace || {};
        const m = p.membership || {};
        if (!w.id || !w.name) return fail("工作空间数据不完整");
        await sql`
          insert into workspaces (id, name, code, type, logo, owner_id, description, phone, address, status)
          values (
            ${w.id}, ${w.name}, ${w.code || w.name.slice(0, 4)}, ${w.type || "company"}, ${w.logo || ""},
            ${accountId}, ${w.description || ""}, ${w.phone || ""}, ${w.address || ""}, 'active'
          )
          on conflict (id) do nothing
        `;
        await sql`
          insert into memberships (id, workspace_id, account_id, role, status)
          values (${m.id || `MEM-${w.id}`}, ${w.id}, ${accountId}, 'owner', 'active')
          on conflict (workspace_id, account_id) do nothing
        `;
        break;
      }

      case "joinWorkspace":
      case "addMember": {
        const m = p.membership || {};
        if (!m.workspaceId || !m.accountId) return fail("成员数据不完整");
        await sql`
          insert into memberships (id, workspace_id, account_id, role, department_id, status)
          values (
            ${m.id || `MEM-${m.workspaceId}-${m.accountId}`}, ${m.workspaceId}, ${m.accountId},
            ${m.role || "member"}, ${m.departmentId || null}, ${m.status || "active"}
          )
          on conflict (workspace_id, account_id) do nothing
        `;
        break;
      }

      case "invite": {
        const i = p.invitation || {};
        if (!i.workspaceId || !i.email) return fail("邀请数据不完整");
        // 服务端权威校验：已是成员不可邀请；已有待处理邀请不重复创建
        const accountRows = await sql`select id from accounts where lower(email) = ${String(i.email).toLowerCase()} or phone = ${String(i.email)}`;
        const inviteeId = accountRows[0] ? String(accountRows[0].id) : null;
        if (inviteeId) {
          const joined = await sql`select 1 from memberships where workspace_id = ${i.workspaceId} and account_id = ${inviteeId} and status = 'active'`;
          if (joined.length) return fail("该账号已在组织中");
        }
        const pending = await sql`select id from invitations where workspace_id = ${i.workspaceId} and lower(email) = ${String(i.email).toLowerCase()} and status = 'pending'`;
        if (pending.length) return fail("该邮箱已有待处理的邀请");
        // 退出/拒绝后重邀：翻转历史邀请记录为 pending，避免重复数据
        const all = await sql`select id from invitations where workspace_id = ${i.workspaceId} and lower(email) = ${String(i.email).toLowerCase()}`;
        if (all.length) {
          await sql`
            update invitations set role = ${i.role || "member"}, token = ${i.token}, status = 'pending',
              invited_by = ${accountId}, created_at = current_date where id = ${String(all[0].id)}
          `;
        } else {
          await sql`
            insert into invitations (id, workspace_id, email, role, token, status, invited_by)
            values (${i.id}, ${i.workspaceId}, ${String(i.email).toLowerCase()}, ${i.role || "member"}, ${i.token}, 'pending', ${accountId})
          `;
        }
        break;
      }

      case "acceptInvitation": {
        const invitationId = String(p.invitationId || "");
        if (!invitationId) return fail("缺少邀请 ID");
        const rows = await sql`select * from invitations where id = ${invitationId} and status = 'pending'`;
        if (!rows.length) return fail("邀请不存在或已处理");
        const inv = rows[0];
        const pendingWorkspace = await sql`select deletion_expires_at from workspaces where id = ${inv.workspace_id}`;
        if (pendingWorkspace[0]?.deletion_expires_at) return fail("组织注销中，无法加入");
        const me = await sql`select email, phone from accounts where id = ${accountId} limit 1`;
        const keys = [me[0]?.email, me[0]?.phone].map((v: unknown) => (v ? String(v).trim().toLowerCase() : "")).filter(Boolean);
        if (!keys.includes(String(inv.email).toLowerCase())) return fail("该邀请不属于当前账号", 403);
        const joined = await sql`select 1 from memberships where workspace_id = ${inv.workspace_id} and account_id = ${accountId}`;
        if (!joined.length) {
          await sql`
            insert into memberships (id, workspace_id, account_id, role, status)
            values (${`MEM-${inv.workspace_id}-${accountId}`}, ${inv.workspace_id}, ${accountId}, ${inv.role || "member"}, 'active')
            on conflict (workspace_id, account_id) do nothing
          `;
        } else {
          await sql`update memberships set status = 'active' where workspace_id = ${inv.workspace_id} and account_id = ${accountId}`;
        }
        await sql`update invitations set status = 'accepted' where id = ${invitationId}`;
        break;
      }

      case "declineInvitation": {
        const invitationId = String(p.invitationId || "");
        if (!invitationId) return fail("缺少邀请 ID");
        const rows = await sql`select * from invitations where id = ${invitationId} and status = 'pending'`;
        if (!rows.length) return fail("邀请不存在或已处理");
        const me = await sql`select email, phone from accounts where id = ${accountId} limit 1`;
        const keys = [me[0]?.email, me[0]?.phone].map((v: unknown) => (v ? String(v).trim().toLowerCase() : "")).filter(Boolean);
        if (!keys.includes(String(rows[0].email).toLowerCase())) return fail("该邀请不属于当前账号", 403);
        await sql`update invitations set status = 'expired' where id = ${invitationId}`;
        break;
      }

      case "leaveWorkspace": {
        const workspaceId = String(p.workspaceId || "");
        if (!workspaceId) return fail("缺少组织 ID");
        const rows = await sql`select role from memberships where workspace_id = ${workspaceId} and account_id = ${accountId}`;
        if (!rows.length) return fail("你不在该组织中");
        if (rows[0].role === "owner") return fail("创建者不能退出自己创建的组织");
        await sql`delete from memberships where workspace_id = ${workspaceId} and account_id = ${accountId}`;
        break;
      }

      case "updateMembership": {
        const id = String(p.id || "");
        const patch = p.patch || {};
        if (!id) return fail("缺少成员 ID");
        if (patch.role !== undefined) await sql`update memberships set role = ${patch.role} where id = ${id}`;
        if (patch.departmentId !== undefined) await sql`update memberships set department_id = ${patch.departmentId} where id = ${id}`;
        if (patch.status !== undefined) await sql`update memberships set status = ${patch.status} where id = ${id}`;
        break;
      }

      case "removeMembership": {
        await sql`delete from memberships where id = ${String(p.id || "")}`;
        break;
      }

      case "deactivateAccount": {
        if (!isSuperAdmin) return fail("仅超级管理员可注销账号", 403);
        const target = String(p.accountId || "");
        if (!target) return fail("缺少账号 ID");
        // 先删该账号拥有的工作空间（级联成员/邀请），再禁用账号
        await sql`delete from workspaces where owner_id = ${target}`;
        await sql`delete from memberships where account_id = ${target}`;
        await sql`delete from invitations where invited_by = ${target}`;
        await sql`
          update accounts set status = 'disabled', password_hash = '', deletion_requested_at = null,
            deletion_reason = '', deletion_expires_at = null
          where id = ${target}
        `;
        break;
      }

      /** 创建者申请注销组织：15 天冷静期，超管同意或到期后删除 */
      case "requestWorkspaceDeletion": {
        const workspaceId = String(p.workspaceId || "");
        const reason = String(p.reason || "").trim();
        if (!workspaceId) return fail("缺少组织 ID");
        if (!reason) return fail("请填写注销原因");
        const member = await sql`select role from memberships where workspace_id = ${workspaceId} and account_id = ${accountId}`;
        if (!member.length || member[0].role !== "owner") return fail("仅组织创建者可申请注销", 403);
        const ws = await sql`select deletion_requested_at from workspaces where id = ${workspaceId}`;
        if (!ws.length) return fail("组织不存在", 404);
        if (ws[0].deletion_requested_at) return fail("该组织已在注销流程中");
        const requestedAt = new Date().toISOString().slice(0, 10);
        await sql`
          update workspaces
          set deletion_requested_at = ${requestedAt}, deletion_reason = ${reason},
            deletion_expires_at = ${addDays(requestedAt, 15)}, deletion_requested_by = ${accountId}
          where id = ${workspaceId}
        `;
        break;
      }

      case "cancelWorkspaceDeletion": {
        const workspaceId = String(p.workspaceId || "");
        if (!workspaceId) return fail("缺少组织 ID");
        const ws = await sql`select owner_id, deletion_requested_at from workspaces where id = ${workspaceId}`;
        if (!ws.length) return fail("组织不存在", 404);
        if (String(ws[0].owner_id) !== accountId) return fail("仅组织创建者可恢复", 403);
        if (!ws[0].deletion_requested_at) return fail("该组织未处于注销流程");
        await sql`
          update workspaces set deletion_requested_at = null, deletion_reason = '',
            deletion_expires_at = null, deletion_requested_by = null
          where id = ${workspaceId}
        `;
        break;
      }

      case "approveWorkspaceDeletion": {
        if (!isSuperAdmin) return fail("仅超级管理员可同意注销", 403);
        const workspaceId = String(p.workspaceId || "");
        if (!workspaceId) return fail("缺少组织 ID");
        await sql`delete from workspaces where id = ${workspaceId}`;
        break;
      }

      case "requestAccountDeletion": {
        const reason = String(p.reason || "").trim();
        if (!reason) return fail("请填写注销原因");
        const me = await sql`select is_super_admin, status, deletion_requested_at from accounts where id = ${accountId}`;
        if (!me.length) return fail("当前账号不存在", 404);
        if (me[0].is_super_admin) return fail("超级管理员账号不可申请注销", 403);
        if (me[0].status !== "active") return fail("当前账号不可申请注销");
        if (me[0].deletion_requested_at) return fail("账号已在注销流程中");
        const requestedAt = new Date().toISOString().slice(0, 10);
        await sql`
          update accounts set status = 'pending-deletion', deletion_requested_at = ${requestedAt},
            deletion_reason = ${reason}, deletion_expires_at = ${addDays(requestedAt, 15)}
          where id = ${accountId}
        `;
        break;
      }

      case "cancelAccountDeletion": {
        const me = await sql`select status from accounts where id = ${accountId}`;
        if (!me.length) return fail("当前账号不存在", 404);
        if (me[0].status !== "pending-deletion") return fail("当前账号未处于注销流程");
        await sql`
          update accounts set status = 'active', deletion_requested_at = null,
            deletion_reason = '', deletion_expires_at = null
          where id = ${accountId}
        `;
        break;
      }

      case "approveAccountDeletion": {
        if (!isSuperAdmin) return fail("仅超级管理员可同意注销", 403);
        const target = String(p.accountId || "");
        if (!target) return fail("缺少账号 ID");
        await sql`delete from workspaces where owner_id = ${target}`;
        await sql`delete from memberships where account_id = ${target}`;
        await sql`delete from invitations where invited_by = ${target}`;
        await sql`
          update accounts set status = 'disabled', password_hash = '', deletion_requested_at = null,
            deletion_reason = '', deletion_expires_at = null
          where id = ${target}
        `;
        break;
      }

      default:
        return fail(`未知操作: ${action}`, 404);
    }

    const db = await readSnapshot(sql, accountId, isSuperAdmin);
    return json({ db });
  } catch (err) {
    return errorResponse(err);
  }
}
