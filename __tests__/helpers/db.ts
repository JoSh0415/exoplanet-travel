import { PrismaClient } from "@prisma/client";

/**
 * Test-only Prisma client — ALWAYS connects to TEST_DATABASE_URL.
 * Never falls through to DATABASE_URL so prod can't be wiped accidentally.
 */
const createPrismaClient = () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. " +
      "Test helpers require a dedicated test database to prevent wiping production data. " +
      "Set TEST_DATABASE_URL in your .env file."
    );
  }
  return new PrismaClient({
    datasources: {
      db: { url },
    },
  });
};

export const prisma = createPrismaClient();

export async function resetDb() {
  // Belt-and-suspenders: verify at call time too, in case env changed
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Refusing to run resetDb() to prevent wiping a non-test database."
    );
  }
  
  // Delete in FK-safe order. Wrap in transaction so it's atomic.
  await prisma.$transaction([
    prisma.booking.deleteMany(),
    prisma.user.deleteMany(),
    prisma.exoplanet.deleteMany(),
  ]);

  // DataImportRun has no FK deps — delete separately so tests pass even if
  // the migration hasn't been applied to the test database yet.
  try {
    await prisma.dataImportRun.deleteMany();
  } catch {
    // table may not exist in the test schema — safe to ignore
  }
}

export async function seedMinimalData() {
  const planet = await prisma.exoplanet.create({
    data: {
      name: "Test Planet A",
      distance: 12.34,
      temperature: 300,
      gravity: 1.11,
      vibe: "Habitable Paradise",
      discoveryYear: 2024,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: "test.user@example.com",
      name: "Test User",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWX12", // dummy hash for tests
    },
  });

  return { planet, user };
}
