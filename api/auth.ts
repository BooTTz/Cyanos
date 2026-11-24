import { getSql, json, fail, readSnapshot, errorResponse, toAccount, processDueDeletions } from "./_lib/db.js";
import { hashPassword, verifyPassword, signToken, randomCode, getBearer } from "./_lib/auth.js";

/** POST /api/auth?action=register|login|send-code|logout */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const body = await request.json().catch(() => ({}));

  try {
    const sql = getSql();
    await processDueDeletions(sql);

    if (action === "send-code") {
      const target = String(body.target || "").trim().toLowerCase();
      if (!target) return fail("请填写邮箱或手机号");
      const code = randomCode();
      await sql`
        insert into verification_codes (target, code, expires_at)
        values (${target}, ${code}, ${Date.now() + 5 * 60 * 1000})
        on conflict (target) do update set code = excluded.code, expires_at = excluded.expires_at
      `;
      // 演示模式：把验证码返回给页面展示。接 Resend 时这里改为发邮件，不再返回 code。
      return json({ code, demo: true });
    }

    if (action === "register") {
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const password = String(body.password || "");
      const code = String(body.code || "").trim();
      if (name.length < 2 || (!email && !phone) || password.length < 6) return fail("请完整填写注册信息");

      // 校验验证码（演示模式：与 verification_codes 表比对）
      if (code) {
        const tickets = await sql`select code, expires_at from verification_codes where target = ${email || phone}`;
        if (!tickets.length) return fail("请先获取验证码");
        if (String(tickets[0].code) !== code || Number(tickets[0].expires_at) < Date.now()) return fail("验证码错误或已过期");
        await sql`delete from verification_codes where target = ${email || phone}`;
      }

      const dup = await sql`select id from accounts where email = ${email || null} or phone = ${phone || null} limit 1`;
      if (dup.length) return fail("该邮箱或手机号已注册");

      const id = `ACC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const rows = await sql`
        insert into accounts (id, email, phone, name, password_hash, avatar_color, is_super_admin, status)
        values (
          ${id}, ${email || null}, ${phone || null}, ${name}, ${hashPassword(password)},
          'oklch(0.62 0.24 292)', false, 'active'
        )
        returning *
      `;
      const account = toAccount(rows[0]);
      const token = signToken({ accountId: account.id, isSuperAdmin: false });
      const db = await readSnapshot(sql, account.id, false);
      return json({ account: { ...account, passwordHash: "" }, token, db });
    }

    if (action === "login") {
      const identifier = String(body.identifier || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!identifier || !password) return fail("请输入账号和密码");
      const rows = await sql`select * from accounts where lower(email) = ${identifier} or phone = ${identifier} limit 1`;
      if (!rows.length) return fail("账号不存在，请先注册", 404);
      const record = rows[0];
      if (record.status === "disabled") return fail("该账号已被注销，请联系管理员");
      if (!verifyPassword(password, record.password_hash)) return fail("密码错误");

      const account = toAccount(record);
      const token = signToken({ accountId: account.id, isSuperAdmin: account.isSuperAdmin });
      const db = await readSnapshot(sql, account.id, account.isSuperAdmin);
      return json({ account: { ...account, passwordHash: "" }, token, db });
    }

    if (action === "logout") {
      // 无状态 token，客户端丢弃即可；保留接口便于将来做服务端会话吊销
      return json({ ok: true });
    }

    return fail("未知操作", 404);
  } catch (err) {
    return errorResponse(err);
  }
}

/** GET /api/auth?action=me —— 用 token 换取当前账号与快照 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "me") return fail("未知操作", 404);
  const auth = getBearer(request);
  if (!auth) return fail("未登录", 401);
  try {
    const sql = getSql();
    await processDueDeletions(sql);
    const accountId = String(auth.accountId);
    const isSuperAdmin = !!auth.isSuperAdmin;
    const rows = await sql`select * from accounts where id = ${accountId} limit 1`;
    if (!rows.length) return fail("账号不存在", 404);
    const db = await readSnapshot(sql, accountId, isSuperAdmin);
    return json({ account: { ...toAccount(rows[0]), passwordHash: "" }, db });
  } catch (err) {
    return errorResponse(err);
  }
}
