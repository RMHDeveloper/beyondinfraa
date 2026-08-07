import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) return apiError("Email and password required");

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.isActive) return apiError("Invalid credentials", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return apiError("Invalid credentials", 401);

  const token = signToken({ userId: user.id, name: user.name, email: user.email, role: user.role });

  const res = Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  const headers = new Headers(res.headers);
  headers.set(
    "Set-Cookie",
    `bi_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`
  );
  return new Response(res.body, { status: 200, headers });
}
