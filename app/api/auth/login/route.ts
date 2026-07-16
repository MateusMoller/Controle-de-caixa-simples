import { eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { createSession, verifyPassword } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const payload = await request.json() as { email?: string; password?: string };
    const email = payload.email?.trim().toLowerCase() ?? "";
    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await verifyPassword(payload.password ?? "", user.passwordHash))) {
      return Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }
    await createSession(user.id);
    return Response.json({ user: { id: user.id, email: user.email } });
  } catch {
    return Response.json({ error: "Não foi possível entrar agora." }, { status: 500 });
  }
}
