import { eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../../db";
import { expenseTypes, incomeTypes } from "../../../../../db/schema";
import { requireApiUser } from "../../../../../lib/auth";

export async function DELETE(_request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  await ensureDatabase();
  if (!(await requireApiUser())) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { kind, id } = await context.params;
  const db = getDb();
  if (kind === "expense") await db.delete(expenseTypes).where(eq(expenseTypes.id, Number(id)));
  else await db.delete(incomeTypes).where(eq(incomeTypes.id, Number(id)));
  return new Response(null, { status: 204 });
}
