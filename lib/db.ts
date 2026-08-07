import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Always use DATABASE_URL (port 6543 pooler) at runtime.
  // SESSION_URL (port 5432 direct) is for migrations only.
  const connectionString = process.env.DATABASE_URL!;
  const pool = new pg.Pool({ connectionString, max: 1 });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Cache on globalThis in all environments so serverless warm instances reuse the pool
export const db = globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());
