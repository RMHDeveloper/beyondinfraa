/**
 * Seed scoring rules from the client-supplied Scoring Weightage PDF.
 * Run: npx tsx prisma/seed-scoring.ts
 *
 * Five profiles (Land Sale / Joint Venture / Redevelopment were split out of a single
 * "special-projects" profile because their templates carry genuinely different fields —
 * only Land Sale has Commission, only Redevelopment has Consent):
 *   selling-buying — Residential/Commercial/Industrial Buy & Sell
 *   rental         — Residential/Commercial/Industrial Rent
 *   land-sale      — Land Sale
 *   joint-venture  — Special Projects / Joint Venture
 *   redevelopment  — Special Projects / Redevelopment
 *
 * Each rule has:
 *   templateSlug  — which profile it belongs to
 *   criterionKey  — groups rules for the same criterion (so totalPossible = max per criterion)
 *   maxScore      — the weightage for this criterion (used for totalPossible)
 *   questionLabel — the template question label whose answer is matched (lowercase).
 *                   For "Commission Finalized (%)" and "Road Width" (both plain
 *                   number fields, not dropdowns), matchValue is a range expression
 *                   (">2%", "1 to 2%", ">=30ft") evaluated numerically by the engine
 *                   instead of compared as an exact string.
 *   matchValue    — exact answer value (or numeric range expression) that triggers this score
 *   score         — points awarded when matched
 *
 * "Legal Documents" (from the original PDF) has no backing field in any template —
 * the closest fields ("Parent Documents" / "Tax Arrears Documents") are file uploads
 * stored on ProjectFile, not Response, so they can't be matched here. Its weightage
 * was folded into Timeline/Road Width instead of left permanently unreachable.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.SESSION_URL ?? process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

type RuleDef = {
  name: string;
  templateSlug: string;
  criterionKey: string;
  maxScore: number;
  questionLabel: string;
  matchValue: string;
  score: number;
};

const RULES: RuleDef[] = [
  // ─── Selling / Buying (Residential, Commercial, Industrial) ───────────────
  { templateSlug: "selling-buying", criterionKey: "mandate",    maxScore: 40, questionLabel: "mandate given to beyondinfra?", name: "Mandate – Yes",             matchValue: "Yes",   score: 40 },
  { templateSlug: "selling-buying", criterionKey: "mandate",    maxScore: 40, questionLabel: "mandate given to beyondinfra?", name: "Mandate – No",              matchValue: "No",    score:  0 },
  { templateSlug: "selling-buying", criterionKey: "commission", maxScore: 40, questionLabel: "commission finalized (%)",      name: "Commission – >2%",          matchValue: ">2",    score: 40 },
  { templateSlug: "selling-buying", criterionKey: "commission", maxScore: 40, questionLabel: "commission finalized (%)",      name: "Commission – 1 to 2%",      matchValue: "1 to 2", score: 20 },
  { templateSlug: "selling-buying", criterionKey: "commission", maxScore: 40, questionLabel: "commission finalized (%)",      name: "Commission – <1%",          matchValue: "<1",    score:  0 },
  { templateSlug: "selling-buying", criterionKey: "timeline",   maxScore: 20, questionLabel: "timeline rating",               name: "Timeline – High (Immediate – 2 months)", matchValue: "High (Immediate – 2 months)", score: 20 },
  { templateSlug: "selling-buying", criterionKey: "timeline",   maxScore: 20, questionLabel: "timeline rating",               name: "Timeline – Low (3+ months)",             matchValue: "Low (3+ months)",             score:  0 },

  // ─── Rental (Residential, Commercial, Industrial) ──────────────────────────
  { templateSlug: "rental", criterionKey: "mandate",    maxScore: 30, questionLabel: "mandate given to beyondinfra?", name: "Mandate – Yes",              matchValue: "Yes",                      score: 30 },
  { templateSlug: "rental", criterionKey: "mandate",    maxScore: 30, questionLabel: "mandate given to beyondinfra?", name: "Mandate – No",               matchValue: "No",                       score:  0 },
  { templateSlug: "rental", criterionKey: "commission", maxScore: 30, questionLabel: "commission finalized",          name: "Commission – High (≥1 month rent)", matchValue: "High (≥1 month rent)", score: 30 },
  { templateSlug: "rental", criterionKey: "commission", maxScore: 30, questionLabel: "commission finalized",          name: "Commission – Low (<1 month rent)",  matchValue: "Low (<1 month rent)",  score:  0 },
  { templateSlug: "rental", criterionKey: "segment",    maxScore: 20, questionLabel: "segment",                       name: "Segment – Industrial",       matchValue: "Industrial",               score: 20 },
  { templateSlug: "rental", criterionKey: "segment",    maxScore: 20, questionLabel: "segment",                       name: "Segment – Commercial",       matchValue: "Commercial",               score: 10 },
  { templateSlug: "rental", criterionKey: "segment",    maxScore: 20, questionLabel: "segment",                       name: "Segment – Residential",      matchValue: "Residential",              score:  5 },
  { templateSlug: "rental", criterionKey: "timeline",   maxScore: 20, questionLabel: "timeline rating",               name: "Timeline – High (Immediate – 2 months)", matchValue: "High (Immediate – 2 months)", score: 20 },
  { templateSlug: "rental", criterionKey: "timeline",   maxScore: 20, questionLabel: "timeline rating",               name: "Timeline – Low (3+ months)",             matchValue: "Low (3+ months)",             score:  0 },

  // ─── Land Sale ──────────────────────────────────────────────────────────────
  { templateSlug: "land-sale", criterionKey: "mandate",     maxScore: 25, questionLabel: "mandate given to beyondinfra?", name: "Mandate – Yes",             matchValue: "Yes",   score: 25 },
  { templateSlug: "land-sale", criterionKey: "mandate",     maxScore: 25, questionLabel: "mandate given to beyondinfra?", name: "Mandate – No",              matchValue: "No",    score:  0 },
  { templateSlug: "land-sale", criterionKey: "commission",  maxScore: 25, questionLabel: "commission finalized (%)",      name: "Commission – >2%",          matchValue: ">2",    score: 25 },
  { templateSlug: "land-sale", criterionKey: "commission",  maxScore: 25, questionLabel: "commission finalized (%)",      name: "Commission – 1 to 2%",      matchValue: "1 to 2", score: 13 },
  { templateSlug: "land-sale", criterionKey: "commission",  maxScore: 25, questionLabel: "commission finalized (%)",      name: "Commission – <1%",          matchValue: "<1",    score:  0 },
  { templateSlug: "land-sale", criterionKey: "road-width",  maxScore: 25, questionLabel: "road width rating",             name: "Road Width – Very High (60ft+)", matchValue: "Very High (60ft+)", score: 25 },
  { templateSlug: "land-sale", criterionKey: "road-width",  maxScore: 25, questionLabel: "road width rating",             name: "Road Width – High (40–59ft)",    matchValue: "High (40–59ft)",    score: 17 },
  { templateSlug: "land-sale", criterionKey: "road-width",  maxScore: 25, questionLabel: "road width rating",             name: "Road Width – Medium (30–39ft)",  matchValue: "Medium (30–39ft)",  score:  8 },
  { templateSlug: "land-sale", criterionKey: "road-width",  maxScore: 25, questionLabel: "road width rating",             name: "Road Width – Low (<30ft)",       matchValue: "Low (<30ft)",       score:  0 },
  { templateSlug: "land-sale", criterionKey: "hrb",         maxScore: 25, questionLabel: "hrb potential",                 name: "HRB – High",  matchValue: "High",   score: 25 },
  { templateSlug: "land-sale", criterionKey: "hrb",         maxScore: 25, questionLabel: "hrb potential",                 name: "HRB – Medium", matchValue: "Medium", score: 13 },
  { templateSlug: "land-sale", criterionKey: "hrb",         maxScore: 25, questionLabel: "hrb potential",                 name: "HRB – Low",    matchValue: "Low",    score:  0 },

  // ─── Joint Venture ───────────────────────────────────────────────────────────
  { templateSlug: "joint-venture", criterionKey: "mandate",    maxScore: 33, questionLabel: "mandate given to beyondinfra?", name: "Mandate – Yes",             matchValue: "Yes",   score: 33 },
  { templateSlug: "joint-venture", criterionKey: "mandate",    maxScore: 33, questionLabel: "mandate given to beyondinfra?", name: "Mandate – No",              matchValue: "No",    score:  0 },
  { templateSlug: "joint-venture", criterionKey: "road-width", maxScore: 33, questionLabel: "road width rating",             name: "Road Width – High (60ft+)",     matchValue: "High (60ft+)",     score: 33 },
  { templateSlug: "joint-venture", criterionKey: "road-width", maxScore: 33, questionLabel: "road width rating",             name: "Road Width – High (40–59ft)",   matchValue: "High (40–59ft)",   score: 22 },
  { templateSlug: "joint-venture", criterionKey: "road-width", maxScore: 33, questionLabel: "road width rating",             name: "Road Width – Medium (30–39ft)", matchValue: "Medium (30–39ft)", score: 11 },
  { templateSlug: "joint-venture", criterionKey: "road-width", maxScore: 33, questionLabel: "road width rating",             name: "Road Width – Low (<30ft)",      matchValue: "Low (<30ft)",      score:  0 },
  { templateSlug: "joint-venture", criterionKey: "hrb",        maxScore: 34, questionLabel: "hrb potential",                 name: "HRB – High",  matchValue: "High",   score: 34 },
  { templateSlug: "joint-venture", criterionKey: "hrb",        maxScore: 34, questionLabel: "hrb potential",                 name: "HRB – Medium", matchValue: "Medium", score: 17 },
  { templateSlug: "joint-venture", criterionKey: "hrb",        maxScore: 34, questionLabel: "hrb potential",                 name: "HRB – Low",    matchValue: "Low",    score:  0 },

  // ─── Redevelopment ────────────────────────────────────────────────────────────
  { templateSlug: "redevelopment", criterionKey: "mandate",    maxScore: 25, questionLabel: "mandate given to beyondinfra?", name: "Mandate – Yes",              matchValue: "Yes",              score: 25 },
  { templateSlug: "redevelopment", criterionKey: "mandate",    maxScore: 25, questionLabel: "mandate given to beyondinfra?", name: "Mandate – No",               matchValue: "No",               score:  0 },
  { templateSlug: "redevelopment", criterionKey: "road-width", maxScore: 25, questionLabel: "road width rating",             name: "Road Width – High (60ft+)",     matchValue: "High (60ft+)",     score: 25 },
  { templateSlug: "redevelopment", criterionKey: "road-width", maxScore: 25, questionLabel: "road width rating",             name: "Road Width – High (40–59ft)",   matchValue: "High (40–59ft)",   score: 17 },
  { templateSlug: "redevelopment", criterionKey: "road-width", maxScore: 25, questionLabel: "road width rating",             name: "Road Width – Medium (30–39ft)", matchValue: "Medium (30–39ft)", score:  8 },
  { templateSlug: "redevelopment", criterionKey: "road-width", maxScore: 25, questionLabel: "road width rating",             name: "Road Width – Low (<30ft)",      matchValue: "Low (<30ft)",      score:  0 },
  { templateSlug: "redevelopment", criterionKey: "hrb",        maxScore: 25, questionLabel: "hrb potential",                 name: "HRB – High",  matchValue: "High",   score: 25 },
  { templateSlug: "redevelopment", criterionKey: "hrb",        maxScore: 25, questionLabel: "hrb potential",                 name: "HRB – Medium", matchValue: "Medium", score: 13 },
  { templateSlug: "redevelopment", criterionKey: "hrb",        maxScore: 25, questionLabel: "hrb potential",                 name: "HRB – Low",    matchValue: "Low",    score:  0 },
  { templateSlug: "redevelopment", criterionKey: "consent",    maxScore: 25, questionLabel: "consent rating",                name: "Consent – High (100%)",       matchValue: "High (100%)",       score: 25 },
  { templateSlug: "redevelopment", criterionKey: "consent",    maxScore: 25, questionLabel: "consent rating",                name: "Consent – Medium (68–99%)",   matchValue: "Medium (68–99%)",   score: 13 },
  { templateSlug: "redevelopment", criterionKey: "consent",    maxScore: 25, questionLabel: "consent rating",                name: "Consent – Low (<68%)",        matchValue: "Low (<68%)",        score:  0 },
];

async function main() {
  console.log("Replacing all scoring rules...");
  await db.scoringRule.deleteMany({});

  for (let i = 0; i < RULES.length; i++) {
    const r = RULES[i];
    await db.scoringRule.create({
      data: { ...r, sortOrder: i + 1 },
    });
    console.log(`  [${i + 1}/${RULES.length}] ${r.templateSlug} / ${r.criterionKey}: ${r.name} = ${r.score}`);
  }

  console.log(`\nDone — ${RULES.length} rules seeded.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => pool.end());
