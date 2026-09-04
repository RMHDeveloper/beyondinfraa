import { getSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const GET = withErrorHandling(async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ user: session });
});
