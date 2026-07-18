import { asc } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../db";
import {
  entryContacts,
  entryDescriptions,
  expenseTypes,
  incomeTypes,
} from "../../../db/schema";
import { requireApiUser } from "../../../lib/auth";

export async function GET() {
  await ensureDatabase();
  if (!(await requireApiUser()))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const db = getDb();
  const [income, expense, descriptions, contacts] = await Promise.all([
    db.select().from(incomeTypes).orderBy(asc(incomeTypes.name)),
    db.select().from(expenseTypes).orderBy(asc(expenseTypes.name)),
    db.select().from(entryDescriptions).orderBy(asc(entryDescriptions.name)),
    db.select().from(entryContacts).orderBy(asc(entryContacts.name)),
  ]);
  return Response.json({ income, expense, descriptions, contacts });
}

export async function POST(request: Request) {
  await ensureDatabase();
  if (!(await requireApiUser()))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const payload = (await request.json()) as { kind?: string; name?: string };
  const name = payload.name?.trim();
  if (!name || name.length > 50)
    return Response.json(
      { error: "Informe um nome com até 50 caracteres." },
      { status: 400 },
    );
  try {
    const db = getDb();
    const table =
      payload.kind === "expense"
        ? expenseTypes
        : payload.kind === "description"
          ? entryDescriptions
          : payload.kind === "contact"
            ? entryContacts
            : incomeTypes;
    const [created] = await db.insert(table).values({ name }).returning();
    return Response.json({ item: created }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Esse tipo já está cadastrado." },
      { status: 409 },
    );
  }
}
