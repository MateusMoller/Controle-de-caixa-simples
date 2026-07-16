export async function POST() {
  return Response.json({ error: "A criação de novos usuários está desativada." }, { status: 403 });
}
