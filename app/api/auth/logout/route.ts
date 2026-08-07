export async function POST() {
  const res = Response.json({ ok: true });
  const headers = new Headers(res.headers);
  headers.set("Set-Cookie", "bi_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  return new Response(res.body, { status: 200, headers });
}
