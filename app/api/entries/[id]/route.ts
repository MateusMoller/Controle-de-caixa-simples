import { eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../db";
import { entries } from "../../../../db/schema";
import { requireApiUser } from "../../../../lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDatabase();
  if (!(await requireApiUser())) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await context.params;
  const payload = await request.json() as { paidAmountCents?: number; settlementDate?: string | null };
  const [current] = await getDb().select().from(entries).where(eq(entries.id, Number(id))).limit(1);
  if (!current) return Response.json({ error: "Lançamento não encontrado" }, { status: 404 });
  const paidAmountCents = Math.max(0, Math.min(current.amountCents, Math.round(Number(payload.paidAmountCents) || 0)));
  const [entry] = await getDb().update(entries).set({ paidAmountCents, paid: paidAmountCents >= current.amountCents, settlementDate: paidAmountCents > 0 ? payload.settlementDate || new Date().toISOString().slice(0, 10) : null }).where(eq(entries.id, Number(id))).returning();
  if (!entry) return Response.json({ error: "Lançamento não encontrado" }, { status: 404 });
  return Response.json({ entry });
}
