import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ConsentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Creates one rich demo project with all tabs populated + scoring rules
export async function POST() {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Find Land Sale template ──────────────────────────────────────────────────
  const landCat = await db.category.findFirst({ where: { slug: "land" } });
  const saleSub = await db.subcategory.findFirst({ where: { categoryId: landCat!.id, slug: "sale" } });
  const template = await db.template.findFirst({
    where: { subcategoryId: saleSub!.id },
    include: { groups: { include: { group: { include: { questions: true } } } } },
  });
  if (!template) return Response.json({ error: "Land Sale template not found. Run seed first." }, { status: 400 });

  const status = await db.status.findFirst({ where: { slug: "in-progress" } });
  const count   = await db.project.count();

  // ── Create demo project ──────────────────────────────────────────────────────
  const project = await db.project.create({
    data: {
      projectNumber: `BI-LND-${String(count + 1).padStart(4, "0")}`,
      title: "Demo Land Sale — Anna Nagar West",
      categoryId: landCat!.id,
      subcategoryId: saleSub!.id,
      templateId: template.id,
      templateVersion: template.version,
      statusId: status?.id ?? null,
      assigneeId: session.id,
      clientName: "Suresh Rajan",
      clientPhone: "9876543210",
      clientEmail: "suresh.rajan@example.com",
      leadSource: "Referral",
      leadDate: new Date("2026-07-15"),
      potentialScore: 20,
    },
  });

  // ── Fill responses for known question labels ─────────────────────────────────
  const allQuestions = template.groups.flatMap(tg => tg.group.questions);
  const qMap: Record<string, string> = {};
  for (const q of allQuestions) qMap[q.label] = q.id;

  const responses: { questionId: string; value: string }[] = [
    { questionId: qMap["Lead Source"],                  value: "Referral" },
    { questionId: qMap["Lead Date"],                    value: "2026-07-15" },
    { questionId: qMap["Primary Owner Name"],            value: "Suresh Rajan" },
    { questionId: qMap["Primary Contact Name"],          value: "Suresh Rajan" },
    { questionId: qMap["Primary Contact Phone"],         value: "9876543210" },
    { questionId: qMap["Primary Contact Email"],         value: "suresh.rajan@example.com" },
    { questionId: qMap["Decision Maker"],                value: "Self" },
    { questionId: qMap["Ownership Pattern"],             value: "Single Owner" },
    { questionId: qMap["Street Name"],                   value: "7th Avenue" },
    { questionId: qMap["Area / Locality"],               value: "Anna Nagar West" },
    { questionId: qMap["Google Maps Pin / Link"],        value: "https://maps.google.com/?q=Anna+Nagar+West" },
    { questionId: qMap["Within 500m of Metro Line?"],    value: "Yes" },
    { questionId: qMap["Nearest Metro Line"],            value: "Chennai Metro — Green Line" },
    { questionId: qMap["Land Area as per Sale Deed"],    value: "5400" },
    { questionId: qMap["Land Area as per Patta"],        value: "5400" },
    { questionId: qMap["Dimensions — Length"],           value: "90" },
    { questionId: qMap["Dimensions — Breadth"],          value: "60" },
    { questionId: qMap["Frontage"],                      value: "30" },
    { questionId: qMap["Road Width"],                    value: "35" },
    { questionId: qMap["Shape of Land"],                 value: "Rectangle" },
    { questionId: qMap["Survey Number"],                 value: "Survey 247/2A" },
    { questionId: qMap["New Guideline Value (TNREGINET)"], value: "12000" },
    { questionId: qMap["Current Land Classification"],   value: "Residential" },
    { questionId: qMap["Approval Authority"],            value: "CMDA" },
    { questionId: qMap["Current Land Status"],           value: "Vacant Land" },
    { questionId: qMap["Passage Property?"],             value: "No" },
    { questionId: qMap["Corner Plot?"],                  value: "Yes" },
    { questionId: qMap["Segment"],                       value: "Residential" },
    { questionId: qMap["Price Expected — Min"],          value: "7500000" },
    { questionId: qMap["Price Expected — Max"],          value: "9000000" },
    { questionId: qMap["Land Sale Price in Area"],       value: "1600" },
    { questionId: qMap["Reason for Sale"],               value: "Family planning to relocate to US, selling ancestral property." },
    { questionId: qMap["Sale Timeline"],                 value: "Immediate" },
    { questionId: qMap["Payment Preference"],            value: "Immediate" },
    { questionId: qMap["Number of Owners / Signing Authorities"], value: "1" },
    { questionId: qMap["Brokerage Agreed (%)"],         value: "1.5" },
    { questionId: qMap["Mandate Given to BeyondInfra?"], value: "No" },
    { questionId: qMap["Road Width Rating"],             value: "Medium (30–39ft)" },
    { questionId: qMap["HRB Potential"],                 value: "Low" },
    { questionId: qMap["Commission Finalized (%)"],      value: "1.5" },
  ].filter(r => r.questionId); // skip unmapped

  for (const r of responses) {
    await db.response.upsert({
      where: { projectId_questionId: { projectId: project.id, questionId: r.questionId } },
      update: { value: r.value },
      create: { projectId: project.id, questionId: r.questionId, value: r.value },
    });
  }

  // ── Owner units ──────────────────────────────────────────────────────────────
  await db.ownerUnit.createMany({
    data: [
      { projectId: project.id, unitNumber: "Unit A", ownerName: "Suresh Rajan", phone: "9876543210", existingArea: 5400, uds: 5400, consentStatus: ConsentStatus.AGREED },
      { projectId: project.id, unitNumber: "Unit B", ownerName: "Priya Rajan", phone: "9876543211", existingArea: 0, uds: 0, consentStatus: ConsentStatus.UNDECIDED },
    ],
  });

  // ── Contact + Negotiation ────────────────────────────────────────────────────
  const contact = await db.contact.findFirst({ where: { phone: "9123456780" } })
    ?? await db.contact.create({ data: { name: "Karthik Buyer", phone: "9123456780", email: "karthik@example.com", type: "BUYER" } });

  const negotiation = await db.negotiation.create({
    data: { projectId: project.id, contactId: contact.id, status: "ACTIVE" },
  });
  await db.negotiationRound.createMany({
    data: [
      { negotiationId: negotiation.id, roundNumber: 1, offerBy: "buyer", offerAmount: 7800000, notes: "Initial offer" },
      { negotiationId: negotiation.id, roundNumber: 2, offerBy: "seller", offerAmount: 8800000, notes: "Counter offer — below guideline value" },
      { negotiationId: negotiation.id, roundNumber: 3, offerBy: "buyer", offerAmount: 8200000, notes: "Revised offer, including registration charges" },
    ],
  });

  // ── Meeting log (stored as ProjectNote) ─────────────────────────────────────
  const MEETING_PREFIX = "__meeting__:";
  await db.projectNote.createMany({
    data: [
      {
        projectId: project.id,
        authorId: session.id,
        content: MEETING_PREFIX + JSON.stringify({
          title: "Initial Property Walkthrough",
          attendees: "Suresh Rajan, Karthik (Buyer)",
          scheduledAt: "2026-07-18T10:00",
          notes: "Visited site. Owner showed original title documents. Corner plot confirmed.",
          outcome: "Buyer interested — proceed with negotiation",
        }),
      },
      {
        projectId: project.id,
        authorId: session.id,
        content: MEETING_PREFIX + JSON.stringify({
          title: "Price Discussion — Office",
          attendees: "Karthik (Buyer), Maddy (BeyondInfra)",
          scheduledAt: "2026-07-25T15:00",
          notes: "Buyer willing to go upto 8.2Cr if seller agrees. Discussed registration charges inclusion.",
          outcome: "Convey to seller and revert by 28th July",
        }),
      },
    ],
  });

  // ── Audit log ────────────────────────────────────────────────────────────────
  await db.auditLog.createMany({
    data: [
      { projectId: project.id, userId: session.id, action: "CREATE", entityType: "project", entityId: project.id, after: { title: project.title } },
      { projectId: project.id, userId: session.id, action: "UPDATE", entityType: "response", entityId: "Lead Source", before: {}, after: { value: "Referral" } },
      { projectId: project.id, userId: session.id, action: "UPDATE", entityType: "response", entityId: "Road Width", before: {}, after: { value: "35" } },
    ],
  });

  // ── Scoring rules (idempotent) ───────────────────────────────────────────────
  const rules = [
    { name: "Mandate Yes",       templateSlug: "all",             matchValue: "Yes",                     score: 30, sortOrder: 1 },
    { name: "Mandate No",        templateSlug: "all",             matchValue: "No",                      score: -20, sortOrder: 2 },
    { name: "Road 60ft+",        templateSlug: "land-sale",       matchValue: "High (60ft+)",            score: 15, sortOrder: 3 },
    { name: "Road 40–59ft",      templateSlug: "land-sale",       matchValue: "High (40–59ft)",          score: 10, sortOrder: 4 },
    { name: "Road 30–39ft",      templateSlug: "land-sale",       matchValue: "Medium (30–39ft)",        score: 5,  sortOrder: 5 },
    { name: "Road <30ft",        templateSlug: "land-sale",       matchValue: "Low (<30ft)",             score: -5, sortOrder: 6 },
    { name: "HRB High",          templateSlug: "land-sale",       matchValue: "High",                    score: 15, sortOrder: 7 },
    { name: "HRB Medium",        templateSlug: "land-sale",       matchValue: "Medium",                  score: 5,  sortOrder: 8 },
    { name: "HRB Low",           templateSlug: "land-sale",       matchValue: "Low",                     score: -5, sortOrder: 9 },
    { name: "Timeline High",     templateSlug: "all",             matchValue: "High (Immediate – 2 months)", score: 15, sortOrder: 10 },
    { name: "Timeline Low",      templateSlug: "all",             matchValue: "Low (3+ months)",         score: -5, sortOrder: 11 },
    { name: "Consent High",      templateSlug: "redevelopment",   matchValue: "High (100%)",             score: 20, sortOrder: 12 },
    { name: "Consent Medium",    templateSlug: "redevelopment",   matchValue: "Medium (68–99%)",         score: 8,  sortOrder: 13 },
    { name: "Consent Low",       templateSlug: "redevelopment",   matchValue: "Low (<68%)",              score: -10, sortOrder: 14 },
    { name: "Land Price < Budget", templateSlug: "land-buy",      matchValue: "High (Price < Budget)",   score: 20, sortOrder: 15 },
    { name: "Land Price > Budget", templateSlug: "land-buy",      matchValue: "Low (Price > Budget)",    score: -10, sortOrder: 16 },
    { name: "Commission 0–2% (Low)", templateSlug: "all",         matchValue: "0",                       score: 0,  sortOrder: 17 },
  ];

  let rulesCreated = 0;
  for (const r of rules) {
    const existing = await db.scoringRule.findFirst({ where: { name: r.name, templateSlug: r.templateSlug } });
    if (!existing) {
      await db.scoringRule.create({ data: r });
      rulesCreated++;
    }
  }

  return Response.json({
    ok: true,
    projectId: project.id,
    projectNumber: project.projectNumber,
    message: `Demo project created: ${project.title}. ${rulesCreated} scoring rules added.`,
  });
}
