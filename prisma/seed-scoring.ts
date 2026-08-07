/**
 * Seed scoring rules from the client-supplied Scoring Weightage PDF.
 * Run: npx tsx prisma/seed-scoring.ts
 *
 * Three profiles:
 *   selling-buying   — Flat/House/Shop/Office/Warehouse/Land buy
 *   special-projects — Redevelopment/JV/Land Sale (Residential & Commercial)
 *   rental           — Ask & Give rentals
 *
 * Each rule has:
 *   templateSlug  — which profile it belongs to
 *   criterionKey  — groups rules for the same criterion (so totalPossible = max per criterion)
 *   maxScore      — the weightage for this criterion (used for totalPossible)
 *   questionLabel — the template question label whose answer is matched (lowercase)
 *   matchValue    — exact answer value that triggers this score
 *   score         — points awarded when matched
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
  // ─── Selling / Buying ─────────────────────────────────────────────────────
  // Mandate to BIPL — weightage 40
  { templateSlug: "selling-buying", criterionKey: "mandate",    maxScore: 40, questionLabel: "mandate to bipl",  name: "Mandate – Yes",              matchValue: "Yes",             score: 40 },
  { templateSlug: "selling-buying", criterionKey: "mandate",    maxScore: 40, questionLabel: "mandate to bipl",  name: "Mandate – No",               matchValue: "No",              score:  0 },
  // Commission — weightage 40
  { templateSlug: "selling-buying", criterionKey: "commission", maxScore: 40, questionLabel: "commission",       name: "Commission – >2%",           matchValue: ">2%",             score: 40 },
  { templateSlug: "selling-buying", criterionKey: "commission", maxScore: 40, questionLabel: "commission",       name: "Commission – 1 to 2%",       matchValue: "1 to 2%",         score: 20 },
  { templateSlug: "selling-buying", criterionKey: "commission", maxScore: 40, questionLabel: "commission",       name: "Commission – <1%",           matchValue: "<1%",             score:  0 },
  // Timeline — weightage 10
  { templateSlug: "selling-buying", criterionKey: "timeline",   maxScore: 10, questionLabel: "timeline",         name: "Timeline – Immediate",       matchValue: "Immediate",       score: 10 },
  { templateSlug: "selling-buying", criterionKey: "timeline",   maxScore: 10, questionLabel: "timeline",         name: "Timeline – 1 to 3 months",   matchValue: "Between 1 to 3 months", score: 5 },
  { templateSlug: "selling-buying", criterionKey: "timeline",   maxScore: 10, questionLabel: "timeline",         name: "Timeline – After 6 months",  matchValue: "After 6 months",  score:  0 },
  // Legal Documents — weightage 10
  { templateSlug: "selling-buying", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – All available", matchValue: "All available",   score: 10 },
  { templateSlug: "selling-buying", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – Few pending",   matchValue: "Few pending",     score:  5 },
  { templateSlug: "selling-buying", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – Many pending",  matchValue: "Many pending",    score:  0 },

  // ─── Special Projects (Redevelopment / JV / Land Sale) ────────────────────
  // Mandate to BIPL — weightage 20
  { templateSlug: "special-projects", criterionKey: "mandate",    maxScore: 20, questionLabel: "mandate to bipl",  name: "Mandate – Yes",              matchValue: "Yes",             score: 20 },
  { templateSlug: "special-projects", criterionKey: "mandate",    maxScore: 20, questionLabel: "mandate to bipl",  name: "Mandate – No",               matchValue: "No",              score:  0 },
  // Commission — weightage 20
  { templateSlug: "special-projects", criterionKey: "commission", maxScore: 20, questionLabel: "commission",       name: "Commission – >2%",           matchValue: ">2%",             score: 20 },
  { templateSlug: "special-projects", criterionKey: "commission", maxScore: 20, questionLabel: "commission",       name: "Commission – 1 to 2%",       matchValue: "1 to 2%",         score: 10 },
  { templateSlug: "special-projects", criterionKey: "commission", maxScore: 20, questionLabel: "commission",       name: "Commission – <1%",           matchValue: "<1%",             score:  0 },
  // Road Width — weightage 10
  { templateSlug: "special-projects", criterionKey: "road-width", maxScore: 10, questionLabel: "road width",       name: "Road Width – ≥30ft",         matchValue: ">=30ft",          score: 10 },
  { templateSlug: "special-projects", criterionKey: "road-width", maxScore: 10, questionLabel: "road width",       name: "Road Width – <30ft",         matchValue: "<30ft",           score:  0 },
  // HRB Potential — weightage 20
  { templateSlug: "special-projects", criterionKey: "hrb",        maxScore: 20, questionLabel: "hrb potential",    name: "HRB – HRB (highest)",        matchValue: "HRB",             score: 20 },
  { templateSlug: "special-projects", criterionKey: "hrb",        maxScore: 20, questionLabel: "hrb potential",    name: "HRB – S+5",                  matchValue: "S+5",             score: 15 },
  { templateSlug: "special-projects", criterionKey: "hrb",        maxScore: 20, questionLabel: "hrb potential",    name: "HRB – <S+5",                 matchValue: "<S+5",            score: 10 },
  // Consent — weightage 20
  { templateSlug: "special-projects", criterionKey: "consent",    maxScore: 20, questionLabel: "consent",          name: "Consent – 100%",             matchValue: "100%",            score: 20 },
  { templateSlug: "special-projects", criterionKey: "consent",    maxScore: 20, questionLabel: "consent",          name: "Consent – Above 66%",        matchValue: "Above 66%",       score: 10 },
  { templateSlug: "special-projects", criterionKey: "consent",    maxScore: 20, questionLabel: "consent",          name: "Consent – Below 66%",        matchValue: "Below 66%",       score:  0 },
  // Legal Documents — weightage 10
  { templateSlug: "special-projects", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – All available", matchValue: "All available",   score: 10 },
  { templateSlug: "special-projects", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – Few pending",   matchValue: "Few pending",     score:  5 },
  { templateSlug: "special-projects", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – Many pending",  matchValue: "Many pending",    score:  0 },

  // ─── Rental (Ask & Give) ──────────────────────────────────────────────────
  // Mandate to BIPL — weightage 30
  { templateSlug: "rental", criterionKey: "mandate",    maxScore: 30, questionLabel: "mandate to bipl",  name: "Mandate – Yes",              matchValue: "Yes",             score: 40 },
  { templateSlug: "rental", criterionKey: "mandate",    maxScore: 30, questionLabel: "mandate to bipl",  name: "Mandate – No",               matchValue: "No",              score:  0 },
  // Commission — weightage 30
  { templateSlug: "rental", criterionKey: "commission", maxScore: 30, questionLabel: "commission",       name: "Commission – ≥45 days",      matchValue: ">=45 days",       score: 40 },
  { templateSlug: "rental", criterionKey: "commission", maxScore: 30, questionLabel: "commission",       name: "Commission – 30 days",       matchValue: "30 days",         score: 20 },
  { templateSlug: "rental", criterionKey: "commission", maxScore: 30, questionLabel: "commission",       name: "Commission – <30 days",      matchValue: "<30 days",        score:  0 },
  // Segment — weightage 20
  { templateSlug: "rental", criterionKey: "segment",    maxScore: 20, questionLabel: "segment",          name: "Segment – Industrial",       matchValue: "Industrial",      score: 20 },
  { templateSlug: "rental", criterionKey: "segment",    maxScore: 20, questionLabel: "segment",          name: "Segment – Commercial",       matchValue: "Commercial",      score: 10 },
  { templateSlug: "rental", criterionKey: "segment",    maxScore: 20, questionLabel: "segment",          name: "Segment – Residential",      matchValue: "Residential",     score:  5 },
  // Timeline — weightage 10
  { templateSlug: "rental", criterionKey: "timeline",   maxScore: 10, questionLabel: "timeline",         name: "Timeline – Immediate",       matchValue: "Immediate",       score: 10 },
  { templateSlug: "rental", criterionKey: "timeline",   maxScore: 10, questionLabel: "timeline",         name: "Timeline – 1 to 3 months",   matchValue: "Between 1 to 3 months", score: 5 },
  { templateSlug: "rental", criterionKey: "timeline",   maxScore: 10, questionLabel: "timeline",         name: "Timeline – After 6 months",  matchValue: "After 6 months",  score:  0 },
  // Legal Documents — weightage 10
  { templateSlug: "rental", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – All available", matchValue: "All available",   score: 10 },
  { templateSlug: "rental", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – Few pending",   matchValue: "Few pending",     score:  5 },
  { templateSlug: "rental", criterionKey: "legal",      maxScore: 10, questionLabel: "legal documents",  name: "Legal Docs – Many pending",  matchValue: "Many pending",    score:  0 },
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
