/**
 * Seed dummy data for buy-sell matching demo.
 * Run: npx tsx prisma/seed.ts
 *
 * Creates:
 *  - 1 Residential category + "Residential Sale" subcategory (if not exists)
 *  - 1 template with matching-engine-compatible question labels
 *  - 5 Residential Sale properties (open, with price/area/bhk/furnishing/locality responses)
 *  - 4 buyer contacts + buyer requirements (varying budgets/areas/locations)
 *  - 1 tenant contact + tenant requirement (for Commercial rent)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.SESSION_URL ?? process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function upsertCategory(name: string, slug: string, sortOrder: number) {
  return db.category.upsert({
    where: { slug },
    update: {},
    create: { name, slug, sortOrder },
  });
}

async function upsertSubcategory(categoryId: string, name: string, slug: string, sortOrder: number) {
  return db.subcategory.upsert({
    where: { categoryId_slug: { categoryId, slug } },
    update: {},
    create: { name, slug, categoryId, sortOrder },
  });
}

async function main() {
  console.log("Seeding...");

  // ── Categories ──────────────────────────────────────────────────────────────
  const resCat = await upsertCategory("Residential", "residential", 1);
  const comCat = await upsertCategory("Commercial", "commercial", 2);

  // ── Subcategories ───────────────────────────────────────────────────────────
  const resSaleSub = await upsertSubcategory(resCat.id, "Residential Sale", "residential-sale", 1);
  const comRentSub = await upsertSubcategory(comCat.id, "Commercial Rent", "commercial-rent", 1);

  // ── Status ──────────────────────────────────────────────────────────────────
  const activeStatus = await db.status.upsert({
    where: { slug: "active" },
    update: {},
    create: { name: "Active", slug: "active", color: "#059669", sortOrder: 1 },
  });

  // ── Template for Residential Sale ───────────────────────────────────────────
  // Questions use labels the matching engine reads:
  //   "asking price", "area / locality", "built-up area", "bhk", "furnishing status"
  let resSaleTemplate = await db.template.findFirst({
    where: { subcategoryId: resSaleSub.id },
    include: { groups: { include: { group: { include: { questions: true } } } } },
  });

  let priceQId: string, localityQId: string, areaQId: string, bhkQId: string, furnishingQId: string;

  if (!resSaleTemplate) {
    const propGroup = await db.questionGroup.upsert({
      where: { slug: "res-sale-property-info" },
      update: {},
      create: { name: "Property Info", slug: "res-sale-property-info", sortOrder: 1 },
    });

    const priceQ = await db.question.create({
      data: { groupId: propGroup.id, label: "asking price", fieldType: "NUMBER", sortOrder: 1, unit: "Rs" },
    });
    const localityQ = await db.question.create({
      data: { groupId: propGroup.id, label: "area / locality", fieldType: "TEXT", sortOrder: 2 },
    });
    const areaQ = await db.question.create({
      data: { groupId: propGroup.id, label: "built-up area", fieldType: "NUMBER", sortOrder: 3, unit: "sqft" },
    });
    const bhkQ = await db.question.create({
      data: { groupId: propGroup.id, label: "bhk", fieldType: "DROPDOWN", sortOrder: 4, options: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK+"] },
    });
    const furnishingQ = await db.question.create({
      data: { groupId: propGroup.id, label: "furnishing status", fieldType: "DROPDOWN", sortOrder: 5, options: ["Unfurnished", "Semi-Furnished", "Fully Furnished"] },
    });

    resSaleTemplate = await db.template.create({
      data: {
        name: "Residential Sale",
        subcategoryId: resSaleSub.id,
        groups: { create: [{ groupId: propGroup.id, sortOrder: 1 }] },
      },
      include: { groups: { include: { group: { include: { questions: true } } } } },
    });

    priceQId = priceQ.id;
    localityQId = localityQ.id;
    areaQId = areaQ.id;
    bhkQId = bhkQ.id;
    furnishingQId = furnishingQ.id;
  } else {
    const allQs = resSaleTemplate.groups.flatMap(tg => tg.group.questions);
    priceQId = allQs.find(q => q.label === "asking price")!.id;
    localityQId = allQs.find(q => q.label === "area / locality")!.id;
    areaQId = allQs.find(q => q.label === "built-up area")!.id;
    bhkQId = allQs.find(q => q.label === "bhk")!.id;
    furnishingQId = allQs.find(q => q.label === "furnishing status")!.id;
  }

  // ── Template for Commercial Rent ─────────────────────────────────────────────
  let comRentTemplate = await db.template.findFirst({
    where: { subcategoryId: comRentSub.id },
    include: { groups: { include: { group: { include: { questions: true } } } } },
  });

  let comRentQId: string, comLocalityQId: string, comAreaQId: string;

  if (!comRentTemplate) {
    const comGroup = await db.questionGroup.upsert({
      where: { slug: "com-rent-property-info" },
      update: {},
      create: { name: "Property Info", slug: "com-rent-property-info", sortOrder: 1 },
    });

    const rentQ = await db.question.create({
      data: { groupId: comGroup.id, label: "monthly rent", fieldType: "NUMBER", sortOrder: 1, unit: "Rs" },
    });
    const comLocalityQ = await db.question.create({
      data: { groupId: comGroup.id, label: "area / locality", fieldType: "TEXT", sortOrder: 2 },
    });
    const comAreaQ = await db.question.create({
      data: { groupId: comGroup.id, label: "built-up area", fieldType: "NUMBER", sortOrder: 3, unit: "sqft" },
    });

    comRentTemplate = await db.template.create({
      data: {
        name: "Commercial Rent",
        subcategoryId: comRentSub.id,
        groups: { create: [{ groupId: comGroup.id, sortOrder: 1 }] },
      },
      include: { groups: { include: { group: { include: { questions: true } } } } },
    });

    comRentQId = rentQ.id;
    comLocalityQId = comLocalityQ.id;
    comAreaQId = comAreaQ.id;
  } else {
    const allQs = comRentTemplate.groups.flatMap(tg => tg.group.questions);
    comRentQId = allQs.find(q => q.label === "monthly rent")!.id;
    comLocalityQId = allQs.find(q => q.label === "area / locality")!.id;
    comAreaQId = allQs.find(q => q.label === "built-up area")!.id;
  }

  // ── Helper: create project ────────────────────────────────────────────────
  async function createProject(opts: {
    num: string; title: string; catId: string; subId: string; templateId: string;
    price?: number; locality?: string; area?: number; bhk?: string; furnishing?: string;
    rent?: number;
    qIds: { price?: string; locality?: string; area?: string; bhk?: string; furnishing?: string; rent?: string };
  }) {
    const existing = await db.project.findUnique({ where: { projectNumber: opts.num } });
    if (existing) { console.log(`  skip project ${opts.num}`); return existing; }

    const p = await db.project.create({
      data: {
        projectNumber: opts.num,
        title: opts.title,
        categoryId: opts.catId,
        subcategoryId: opts.subId,
        templateId: opts.templateId,
        templateVersion: 1,
        statusId: activeStatus.id,
        state: "OPEN",
        clientName: "Demo Owner",
      },
    });

    const responseData: { projectId: string; questionId: string; value: string }[] = [];
    if (opts.price && opts.qIds.price) responseData.push({ projectId: p.id, questionId: opts.qIds.price, value: String(opts.price) });
    if (opts.locality && opts.qIds.locality) responseData.push({ projectId: p.id, questionId: opts.qIds.locality, value: opts.locality });
    if (opts.area && opts.qIds.area) responseData.push({ projectId: p.id, questionId: opts.qIds.area, value: String(opts.area) });
    if (opts.bhk && opts.qIds.bhk) responseData.push({ projectId: p.id, questionId: opts.qIds.bhk, value: opts.bhk });
    if (opts.furnishing && opts.qIds.furnishing) responseData.push({ projectId: p.id, questionId: opts.qIds.furnishing, value: opts.furnishing });
    if (opts.rent && opts.qIds.rent) responseData.push({ projectId: p.id, questionId: opts.qIds.rent, value: String(opts.rent) });

    for (const r of responseData) {
      await db.response.upsert({
        where: { projectId_questionId: { projectId: r.projectId, questionId: r.questionId } },
        update: { value: r.value },
        create: r,
      });
    }

    console.log(`  created project ${opts.num}: ${opts.title}`);
    return p;
  }

  // ── 5 Residential Sale properties ─────────────────────────────────────────
  // Price in rupees (raw), Area in sqft
  const resQIds = { price: priceQId, locality: localityQId, area: areaQId, bhk: bhkQId, furnishing: furnishingQId };

  await createProject({ num: "PRJ-0101", title: "3BHK Apartment in Bandra West", catId: resCat.id, subId: resSaleSub.id, templateId: resSaleTemplate.id, price: 25000000, locality: "Bandra West", area: 1400, bhk: "3 BHK", furnishing: "Semi-Furnished", qIds: resQIds });
  await createProject({ num: "PRJ-0102", title: "2BHK Flat in Andheri East", catId: resCat.id, subId: resSaleSub.id, templateId: resSaleTemplate.id, price: 12000000, locality: "Andheri East", area: 850, bhk: "2 BHK", furnishing: "Unfurnished", qIds: resQIds });
  await createProject({ num: "PRJ-0103", title: "4BHK Sea-View in Juhu", catId: resCat.id, subId: resSaleSub.id, templateId: resSaleTemplate.id, price: 65000000, locality: "Juhu", area: 2800, bhk: "4 BHK", furnishing: "Fully Furnished", qIds: resQIds });
  await createProject({ num: "PRJ-0104", title: "2BHK in Powai", catId: resCat.id, subId: resSaleSub.id, templateId: resSaleTemplate.id, price: 14000000, locality: "Powai", area: 920, bhk: "2 BHK", furnishing: "Semi-Furnished", qIds: resQIds });
  await createProject({ num: "PRJ-0105", title: "3BHK in Chembur", catId: resCat.id, subId: resSaleSub.id, templateId: resSaleTemplate.id, price: 18000000, locality: "Chembur", area: 1250, bhk: "3 BHK", furnishing: "Unfurnished", qIds: resQIds });

  // ── 2 Commercial Rent properties ──────────────────────────────────────────
  const comQIds = { rent: comRentQId, locality: comLocalityQId, area: comAreaQId };

  await createProject({ num: "PRJ-0201", title: "Office Space in BKC", catId: comCat.id, subId: comRentSub.id, templateId: comRentTemplate.id, rent: 180000, locality: "BKC", area: 3000, qIds: comQIds });
  await createProject({ num: "PRJ-0202", title: "Retail Shop in Lower Parel", catId: comCat.id, subId: comRentSub.id, templateId: comRentTemplate.id, rent: 80000, locality: "Lower Parel", area: 1200, qIds: comQIds });

  // ── Buyer contacts + requirements ─────────────────────────────────────────
  async function upsertContact(name: string, phone: string, type: "BUYER" | "TENANT") {
    const existing = await db.contact.findFirst({ where: { phone } });
    if (existing) return existing;
    return db.contact.create({ data: { name, phone, type } });
  }

  async function upsertBuyerReq(opts: {
    num: string; contactId: string; catId: string;
    budgetMin: number; budgetMax: number; areaMin: number; areaMax: number;
    bhk?: string; furnishing?: string; locations: string[];
  }) {
    const existing = await db.buyerRequirement.findUnique({ where: { reqNumber: opts.num } });
    if (existing) { console.log(`  skip req ${opts.num}`); return existing; }
    const r = await db.buyerRequirement.create({
      data: {
        reqNumber: opts.num,
        contactId: opts.contactId,
        categoryId: opts.catId,
        budgetMin: opts.budgetMin,
        budgetMax: opts.budgetMax,
        areaMin: opts.areaMin,
        areaMax: opts.areaMax,
        bhk: opts.bhk ?? null,
        furnishing: opts.furnishing ?? null,
        preferredLocations: opts.locations,
        status: "ACTIVE",
      },
    });
    console.log(`  created buyer req ${opts.num}`);
    return r;
  }

  // Buyer 1: wants 3BHK in Bandra, budget 2–3Cr, 1200–1600sqft → should match PRJ-0101 (high)
  const b1 = await upsertContact("Amit Sharma", "9811001001", "BUYER");
  await upsertBuyerReq({ num: "BR-0001", contactId: b1.id, catId: resCat.id, budgetMin: 20000000, budgetMax: 30000000, areaMin: 1200, areaMax: 1600, bhk: "3 BHK", furnishing: "Semi-Furnished", locations: ["Bandra West", "Bandra East"] });

  // Buyer 2: wants 2BHK in Andheri, budget 1–1.5Cr → should match PRJ-0102 (high), PRJ-0104 partially
  const b2 = await upsertContact("Priya Mehta", "9811002002", "BUYER");
  await upsertBuyerReq({ num: "BR-0002", contactId: b2.id, catId: resCat.id, budgetMin: 10000000, budgetMax: 15000000, areaMin: 700, areaMax: 1000, bhk: "2 BHK", locations: ["Andheri East", "Andheri West", "Powai"] });

  // Buyer 3: budget 5–8Cr, 4BHK in Juhu → should match PRJ-0103 (high)
  const b3 = await upsertContact("Rahul Kapoor", "9811003003", "BUYER");
  await upsertBuyerReq({ num: "BR-0003", contactId: b3.id, catId: resCat.id, budgetMin: 50000000, budgetMax: 80000000, areaMin: 2500, areaMax: 3500, bhk: "4 BHK", furnishing: "Fully Furnished", locations: ["Juhu", "Bandra West"] });

  // Buyer 4: flexible budget 1–2Cr, any 2-3BHK in Mumbai → matches multiple partially
  const b4 = await upsertContact("Sneha Iyer", "9811004004", "BUYER");
  await upsertBuyerReq({ num: "BR-0004", contactId: b4.id, catId: resCat.id, budgetMin: 10000000, budgetMax: 20000000, areaMin: 800, areaMax: 1400, locations: ["Andheri East", "Powai", "Chembur", "Bandra West"] });

  // ── Tenant contact + requirement ──────────────────────────────────────────
  const t1 = await upsertContact("InnoTech Pvt Ltd", "9811005005", "TENANT");
  const existingTenantReq = await db.tenantRequirement.findUnique({ where: { reqNumber: "TR-0001" } });
  if (!existingTenantReq) {
    await db.tenantRequirement.create({
      data: {
        reqNumber: "TR-0001",
        contactId: t1.id,
        categoryId: comCat.id,
        rentMin: 150000,
        rentMax: 220000,
        areaMin: 2500,
        areaMax: 4000,
        preferredLocations: ["BKC", "Lower Parel", "Worli"],
        status: "ACTIVE",
      },
    });
    console.log("  created tenant req TR-0001");
  } else {
    console.log("  skip req TR-0001");
  }

  console.log("\nDone! Now go to /projects → Matching tab → Run Matching.");
  console.log("Expected results:");
  console.log("  BR-0001 (Amit): PRJ-0101 ~100% | others low");
  console.log("  BR-0002 (Priya): PRJ-0102 ~100% | PRJ-0104 ~80%");
  console.log("  BR-0003 (Rahul): PRJ-0103 ~100%");
  console.log("  BR-0004 (Sneha): PRJ-0102/0104 ~60-80% | others lower");
  console.log("  TR-0001 (InnoTech): PRJ-0201 ~100% | PRJ-0202 ~50%");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => pool.end());
