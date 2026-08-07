import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — public: fetch token info (no auth required)
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await db.buyerIntakeToken.findUnique({
    where: { token },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!record || !record.isActive) return Response.json({ error: "Not found" }, { status: 404 });
  if (record.expiresAt && record.expiresAt < new Date()) {
    return Response.json({ error: "This link has expired" }, { status: 410 });
  }
  return Response.json({ id: record.id, label: record.label, category: record.category });
}

// POST — public: submit intake form
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await db.buyerIntakeToken.findUnique({ where: { token } });
  if (!record || !record.isActive) return Response.json({ error: "Not found" }, { status: 404 });
  if (record.expiresAt && record.expiresAt < new Date()) {
    return Response.json({ error: "Expired" }, { status: 410 });
  }

  const body = await req.json();
  const { name, phone, email, ...rest } = body;
  if (!name?.trim() || !phone?.trim()) {
    return Response.json({ error: "name and phone required" }, { status: 400 });
  }

  const submission = await db.buyerIntakeSubmission.create({
    data: { tokenId: record.id, name: name.trim(), phone: phone.trim(), email: email?.trim() ?? null, data: rest },
  });

  // Auto-create a contact + buyer requirement from the submission
  let contact = await db.contact.findFirst({ where: { phone: phone.trim() } });
  if (!contact) {
    contact = await db.contact.create({
      data: { name: name.trim(), phone: phone.trim(), email: email?.trim() ?? null, type: "BUYER" },
    });
  }

  const count = await db.buyerRequirement.count();
  const reqNumber = `BR-${String(count + 1).padStart(4, "0")}`;

  await db.buyerRequirement.create({
    data: {
      reqNumber,
      contactId: contact.id,
      categoryId: record.categoryId,
      budgetMin:  rest.budgetMin  ? parseFloat(rest.budgetMin)  : null,
      budgetMax:  rest.budgetMax  ? parseFloat(rest.budgetMax)  : null,
      areaMin:    rest.areaMin    ? parseFloat(rest.areaMin)    : null,
      areaMax:    rest.areaMax    ? parseFloat(rest.areaMax)    : null,
      bhk:        rest.bhk        || null,
      furnishing: rest.furnishing || null,
      preferredLocations: rest.locations ? rest.locations.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      notes:      rest.notes      || null,
      status: "NEW",
    },
  });

  return Response.json({ ok: true, submissionId: submission.id }, { status: 201 });
}
