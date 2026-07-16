import { eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../db";
import { entries } from "../../../../db/schema";
import { requireApiUser } from "../../../../lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDatabase();
  if (!(await requireApiUser())) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await context.params;
  const payload = await request.json() as { paid?: boolean };
  const [entry] = await getDb().update(entries).set({ paid: Boolean(payload.paid) }).where(eq(entries.id, Number(id))).returning();
  if (!entry) return Response.json({ error: "Lançamento não encontrado" }, { status: 404 });
  return Response.json({ entry });
}
