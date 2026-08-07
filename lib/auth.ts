import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";
import type { SessionUser } from "@/types";

const SECRET = process.env.JWT_SECRET!;
const EXPIRES = process.env.JWT_EXPIRES_IN ?? "7d";

export type JwtPayload = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// New tokens carry name+email in the JWT — zero DB calls.
// Legacy tokens (userId+role only) do one DB lookup; errors return null safely.
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("bi_token")?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    if (!payload.name || !payload.email) {
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });
      if (!user || !user.isActive) return null;
      return user as SessionUser;
    }
    return { id: payload.userId, name: payload.name, email: payload.email, role: payload.role as SessionUser["role"], isActive: true };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
