import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { entries } from "../../../db/schema";

function parseMoney(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

function parseRate(value: unknown) {
  const rate = Number(String(value ?? "0").trim().replace(",", "."));
  return Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : 0;
}

function addMonths(dateText: string, offset: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export async function GET() {
  try {
    const rows = await getDb().select().from(entries).orderBy(asc(entries.dueDate), asc(entries.id));
    return Response.json({ entries: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erro ao carregar lançamentos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const description = String(payload.description ?? "").trim();
    const contact = String(payload.contact ?? "").trim();
    const category = String(payload.category ?? "Outros").trim();
    const type = payload.type === "expense" ? "expense" : "income";
    const dueDate = String(payload.dueDate ?? "");
    const installments = Math.max(1, Math.min(60, Number(payload.installments) || 1));
    const principalCents = parseMoney(payload.amount);
    const requestedInterest = payload.interestType === "simple" || payload.interestType === "compound" ? payload.interestType : "none";
    const interestType = installments > 1 ? requestedInterest : "none";
    const monthlyRate = interestType === "none" ? 0 : parseRate(payload.interestRate);
    const interestRateBps = Math.round(monthlyRate * 100);
    const rate = monthlyRate / 100;
    const totalCents = interestType === "simple"
      ? Math.round(principalCents * (1 + rate * installments))
      : interestType === "compound"
        ? Math.round(principalCents * Math.pow(1 + rate, installments))
        : principalCents;
    if (!description || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(principalCents) || principalCents <= 0) return Response.json({ error: "Preencha descrição, valor e vencimento corretamente." }, { status: 400 });
    const groupId = crypto.randomUUID();
    const base = Math.floor(totalCents / installments);
    const remainder = totalCents - base * installments;
    const values = Array.from({ length: installments }, (_, index) => ({ groupId, description, contact, category, type, amountCents: base + (index < remainder ? 1 : 0), dueDate: addMonths(dueDate, index), installment: index + 1, installments, interestType, interestRateBps, paid: false }));
    const created = await getDb().insert(entries).values(values).returning();
    return Response.json({ entries: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erro ao salvar lançamento" }, { status: 500 });
  }
}
