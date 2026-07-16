import { count } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { getCurrentUser } from "../../../../lib/auth";

export async function GET() {
  try {
    await ensureDatabase();
    const [[total], user] = await Promise.all([
      getDb().select({ value: count() }).from(users),
      getCurrentUser(),
    ]);
    return Response.json({ configured: total.value > 0, authenticated: Boolean(user), user });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erro ao verificar acesso." }, { status: 500 });
  }
}
