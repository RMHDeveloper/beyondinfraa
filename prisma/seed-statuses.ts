/**
 * Ensure the default project statuses exist. Safe to re-run — uses upsert by slug.
 * Run: npx tsx prisma/seed-statuses.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.SESSION_URL ?? process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const statuses = [
    { name: "New",       slug: "new",       color: "#2563eb", sortOrder: 1 },
    { name: "On Hold",   slug: "on-hold",   color: "#d97706", sortOrder: 2 },
    { name: "Completed", slug: "completed", color: "#059669", sortOrder: 3 },
    { name: "Dropped",   slug: "dropped",   color: "#dc2626", sortOrder: 4 },
  ];

  for (const s of statuses) {
    await db.status.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
    console.log(`Ensured status: ${s.name}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
