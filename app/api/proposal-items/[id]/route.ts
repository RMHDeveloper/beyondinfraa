import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { response, remarks } = await req.json();

  const data: Record<string, unknown> = {};
  if (response !== undefined) data.response = response;
  if (remarks !== undefined) data.remarks = remarks;

  const item = await db.proposalProperty.update({ where: { id }, data });
  return Response.json(item);
}
