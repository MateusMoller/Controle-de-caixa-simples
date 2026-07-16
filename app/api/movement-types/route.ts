import { asc } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../db";
import { expenseTypes, incomeTypes } from "../../../db/schema";

export async function GET() {
  await ensureDatabase();
  const db = getDb();
  const [income, expense] = await Promise.all([
    db.select().from(incomeTypes).orderBy(asc(incomeTypes.name)),
    db.select().from(expenseTypes).orderBy(asc(expenseTypes.name)),
  ]);
  return Response.json({ income, expense });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const payload = await request.json() as { kind?: string; name?: string };
  const name = payload.name?.trim();
  if (!name || name.length > 50) return Response.json({ error: "Informe um nome com até 50 caracteres." }, { status: 400 });
  try {
    const db = getDb();
    const [created] = payload.kind === "expense"
      ? await db.insert(expenseTypes).values({ name }).returning()
      : await db.insert(incomeTypes).values({ name }).returning();
    return Response.json({ item: created }, { status: 201 });
  } catch {
    return Response.json({ error: "Esse tipo já está cadastrado." }, { status: 409 });
  }
}
