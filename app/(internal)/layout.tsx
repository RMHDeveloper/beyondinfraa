import { redirect } from "next/navigation";
import { getSession, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Force re-login if token is legacy format (missing name/email) — avoids DB call on every nav
  const cookieStore = await cookies();
  const token = cookieStore.get("bi_token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (payload && (!payload.name || !payload.email)) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={session} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
