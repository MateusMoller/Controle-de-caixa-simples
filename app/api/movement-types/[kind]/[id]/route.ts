import { eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../../db";
import { expenseTypes, incomeTypes } from "../../../../../db/schema";

export async function DELETE(_request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  await ensureDatabase();
  const { kind, id } = await context.params;
  const db = getDb();
  if (kind === "expense") await db.delete(expenseTypes).where(eq(expenseTypes.id, Number(id)));
  else await db.delete(incomeTypes).where(eq(incomeTypes.id, Number(id)));
  return new Response(null, { status: 204 });
}
