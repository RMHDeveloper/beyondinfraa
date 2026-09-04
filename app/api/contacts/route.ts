import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET() {
  await requireSession();
  const contacts = await db.contact.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, phone: true, email: true },
  });
  return Response.json(contacts);
});

export const POST = withErrorHandling(async function POST(req: Request) {
  await requireSession();
  const body = await req.json();
  const name = (body.name as string)?.trim();
  const type = body.type as string;
  if (!name || !type) return Response.json({ error: "Name and type are required" }, { status: 400 });

  const contact = await db.contact.create({
    data: {
      name,
      type: type as any,
      phone: (body.phone as string)?.trim() || null,
      email: (body.email as string)?.trim() || null,
      company: (body.company as string)?.trim() || null,
      notes: (body.notes as string)?.trim() || null,
    },
  });

  let developer = null;
  if (type === "DEVELOPER") {
    const preferredLocationsRaw = (body.preferredLocations as string)?.trim() || "";
    developer = await db.developer.create({
      data: {
        contactId: contact.id,
        reraNumber: (body.reraNumber as string)?.trim() || null,
        preferredProjectSize: (body.preferredProjectSize as string)?.trim() || null,
        preferredLocations: preferredLocationsRaw
          ? preferredLocationsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
          : undefined,
        financialCapability: (body.financialCapability as string)?.trim() || null,
        completedProjects: parseInt(body.completedProjects) || 0,
        ongoingProjects: parseInt(body.ongoingProjects) || 0,
        internalRating: parseInt(body.internalRating) || null,
      },
      include: { contact: true },
    });
  }

  return Response.json({ contact, developer });
});
