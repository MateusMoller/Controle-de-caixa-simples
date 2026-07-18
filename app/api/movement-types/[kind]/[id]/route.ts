import { eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../../db";
import {
  entryContacts,
  entryDescriptions,
  expenseTypes,
  incomeTypes,
} from "../../../../../db/schema";
import { requireApiUser } from "../../../../../lib/auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  await ensureDatabase();
  if (!(await requireApiUser()))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { kind, id } = await context.params;
  const db = getDb();
  const table =
    kind === "expense"
      ? expenseTypes
      : kind === "description"
        ? entryDescriptions
        : kind === "contact"
          ? entryContacts
          : incomeTypes;
  await db.delete(table).where(eq(table.id, Number(id)));
  return new Response(null, { status: 204 });
}
