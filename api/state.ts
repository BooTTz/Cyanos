import { getSql, json, fail, readSnapshot, errorResponse, processDueDeletions } from "./_lib/db.js";
import { getBearer } from "./_lib/auth.js";

/** GET /api/state —— 返回当前账号可见的数据快照（前端 bootstrap 调用） */
export async function GET(request: Request) {
  const auth = getBearer(request);
  if (!auth) return fail("未登录", 401);
  try {
    const sql = getSql();
    await processDueDeletions(sql);
    const db = await readSnapshot(sql, String(auth.accountId), !!auth.isSuperAdmin);
    return json({ db });
  } catch (err) {
    return errorResponse(err);
  }
}
