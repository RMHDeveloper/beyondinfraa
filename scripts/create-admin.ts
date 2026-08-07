import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

const databaseUrl = process.env.SESSION_URL ?? process.env.DATABASE_URL;
const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const phone = process.env.ADMIN_PHONE?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!databaseUrl) {
  throw new Error("SESSION_URL or DATABASE_URL is required.");
}

if (!name || !email || !phone || !password) {
  throw new Error(
    "ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE and ADMIN_PASSWORD are required."
  );
}

if (password.length < 12) {
  throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash(password!, 12);

  const conflictingPhone = await db.user.findUnique({ where: { phone: phone! } });
  if (conflictingPhone && conflictingPhone.email !== email) {
    throw new Error(`Phone number ${phone} is already assigned to another user.`);
  }

  const user = await db.user.upsert({
    where: { email: email! },
    update: {
      name: name!,
      phone: phone!,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      name: name!,
      email: email!,
      phone: phone!,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  console.log("SUPER_ADMIN account created or reset successfully:");
  console.table([user]);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
