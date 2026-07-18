import { eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../db";
import { entries } from "../../../../db/schema";
import { requireApiUser } from "../../../../lib/auth";

function parseMoney(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await ensureDatabase();
  if (!(await requireApiUser()))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await context.params;
  const payload = (await request.json()) as {
    paidAmountCents?: number;
    settlementDate?: string | null;
    paymentMethod?: string;
  };
  const [current] = await getDb()
    .select()
    .from(entries)
    .where(eq(entries.id, Number(id)))
    .limit(1);
  if (!current)
    return Response.json(
      { error: "Lançamento não encontrado" },
      { status: 404 },
    );
  const paidAmountCents = Math.max(
    0,
    Math.min(
      current.amountCents,
      Math.round(Number(payload.paidAmountCents) || 0),
    ),
  );
  const [entry] = await getDb()
    .update(entries)
    .set({
      paidAmountCents,
      paid: paidAmountCents >= current.amountCents,
      settlementDate:
        paidAmountCents > 0
          ? payload.settlementDate || new Date().toISOString().slice(0, 10)
          : null,
      paymentMethod: payload.paymentMethod?.trim() || current.paymentMethod,
    })
    .where(eq(entries.id, Number(id)))
    .returning();
  if (!entry)
    return Response.json(
      { error: "Lançamento não encontrado" },
      { status: 404 },
    );
  return Response.json({ entry });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await ensureDatabase();
  if (!(await requireApiUser()))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const amountCents = parseMoney(payload.amount);
  const issueDate = String(payload.issueDate ?? "");
  const dueDate = String(payload.dueDate ?? "");
  const description = String(payload.description ?? "").trim();
  if (
    !description ||
    !Number.isFinite(amountCents) ||
    amountCents <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
  ) {
    return Response.json(
      { error: "Preencha descrição, valor e datas corretamente." },
      { status: 400 },
    );
  }
  const [current] = await getDb()
    .select()
    .from(entries)
    .where(eq(entries.id, Number(id)))
    .limit(1);
  if (!current)
    return Response.json(
      { error: "Lançamento não encontrado" },
      { status: 404 },
    );
  const paidAmountCents = Math.min(current.paidAmountCents, amountCents);
  const [entry] = await getDb()
    .update(entries)
    .set({
      description,
      contact: String(payload.contact ?? "").trim(),
      category: String(payload.category ?? "Outros").trim(),
      type: payload.type === "expense" ? "expense" : "income",
      amountCents,
      paidAmountCents,
      paid: paidAmountCents >= amountCents,
      issueDate,
      dueDate,
      paymentMethod:
        String(payload.paymentMethod ?? "Não informado").trim() ||
        "Não informado",
    })
    .where(eq(entries.id, Number(id)))
    .returning();
  if (!entry)
    return Response.json(
      { error: "Lançamento não encontrado" },
      { status: 404 },
    );
  return Response.json({ entry });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await ensureDatabase();
  if (!(await requireApiUser()))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await context.params;
  const [entry] = await getDb()
    .delete(entries)
    .where(eq(entries.id, Number(id)))
    .returning({ id: entries.id });
  if (!entry)
    return Response.json(
      { error: "Lançamento não encontrado" },
      { status: 404 },
    );
  return new Response(null, { status: 204 });
}
