import { getSql, json, fail, errorResponse } from "./_lib/db.js";
import { getBearer } from "./_lib/auth.js";
import type { RiskDB } from "../src/lib/risk-types";

/** 当前账号是否可访问目标工作空间 */
async function canAccess(sql: ReturnType<typeof getSql>, accountId: string, workspaceId: string, isSuperAdmin: boolean) {
  if (isSuperAdmin) return true;
  const rows = await sql`select 1 from memberships where workspace_id = ${workspaceId} and account_id = ${accountId} limit 1`;
  return rows.length > 0;
}

/** GET /api/risk?workspaceId=xxx —— 读取租户的风险数据快照 */
export async function GET(request: Request) {
  const auth = getBearer(request);
  if (!auth) return fail("未登录", 401);
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") || "";
  if (!workspaceId) return fail("缺少 workspaceId");
  try {
    const sql = getSql();
    if (!(await canAccess(sql, String(auth.accountId), workspaceId, !!auth.isSuperAdmin))) {
      return fail("无权访问该组织数据", 403);
    }
    const rows = await sql`select data from risk_data where workspace_id = ${workspaceId} limit 1`;
    const db: RiskDB = rows[0]?.data ?? { objects: [], units: [], events: [], evaluations: [], measures: [] };
    return json({ db });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/risk —— 全量覆盖写入（风险数据写少读多，单次快照提交简单可靠） */
export async function POST(request: Request) {
  const auth = getBearer(request);
  if (!auth) return fail("未登录", 401);
  const body = await request.json().catch(() => ({}));
  const workspaceId = String(body.workspaceId || "");
  const db = body.db as RiskDB | undefined;
  if (!workspaceId) return fail("缺少 workspaceId");
  if (!db || !Array.isArray(db.objects)) return fail("风险数据格式不正确");
  try {
    const sql = getSql();
    if (!(await canAccess(sql, String(auth.accountId), workspaceId, !!auth.isSuperAdmin))) {
      return fail("无权写入该组织数据", 403);
    }
    await sql`
      insert into risk_data (workspace_id, data, updated_at)
      values (${workspaceId}, ${JSON.stringify(db)}, now())
      on conflict (workspace_id) do update set data = excluded.data, updated_at = now()
    `;
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
