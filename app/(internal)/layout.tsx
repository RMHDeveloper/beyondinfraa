import { redirect } from "next/navigation";
import { getSession, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import AppShell from "@/components/AppShell";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Force re-login if token is legacy format (missing name/email) — avoids DB call on every nav
  const cookieStore = await cookies();
  const token = cookieStore.get("bi_token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (payload && (!payload.name || !payload.email)) redirect("/login");

  return <AppShell user={session}>{children}</AppShell>;
}
