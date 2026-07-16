import { count } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { createSession, hashPassword } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const payload = await request.json() as { email?: string; password?: string };
    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";
    const [total] = await getDb().select({ value: count() }).from(users);
    if (total.value > 0) return Response.json({ error: "A conta administradora já foi criada." }, { status: 403 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    const [user] = await getDb().insert(users).values({ email, passwordHash: await hashPassword(password) }).returning({ id: users.id, email: users.email });
    await createSession(user.id);
    return Response.json({ user }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível criar a conta. Tente novamente." }, { status: 500 });
  }
}
