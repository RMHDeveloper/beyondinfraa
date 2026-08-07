import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();
  const tokens = await db.tenantIntakeToken.findMany({
    include: { category: { select: { name: true } }, _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(tokens);
}

export async function POST(req: Request) {
  await requireSession();
  const { categoryId, label, expiresAt } = await req.json();
  if (!categoryId) return Response.json({ error: "categoryId required" }, { status: 400 });

  const token = await db.tenantIntakeToken.create({
    data: {
      categoryId,
      label: label ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: { category: { select: { name: true } } },
  });
  return Response.json(token, { status: 201 });
}
