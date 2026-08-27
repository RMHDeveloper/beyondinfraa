import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Always use DATABASE_URL (port 6543 pooler) at runtime.
  // SESSION_URL (port 5432 direct) is for migrations only.
  // max: 1 forced every query in a warm instance to serialize behind a single
  // connection — under real concurrent traffic (e.g. several staff loading pages
  // at once) this made requests queue up and get progressively slower, which is
  // consistent with "the list doesn't show the new property until I refresh."
  // Port 6543 is Supabase's PgBouncer transaction pooler, which is built to front
  // many app-side connections, so a small pool here is safe.
  const connectionString = process.env.DATABASE_URL!;
  const pool = new pg.Pool({ connectionString, max: 10 });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Cache on globalThis in all environments so serverless warm instances reuse the pool
export const db = globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());
