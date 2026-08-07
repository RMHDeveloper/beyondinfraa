import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, phone, role, password } = await req.json();
  if (!name || !email || !password || !role) {
    return Response.json({ error: "name, email, password and role are required" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { name, email, phone: phone || null, role, passwordHash: hashed },
    select: { id: true, name: true, email: true, role: true },
  });
  return Response.json(user, { status: 201 });
}
