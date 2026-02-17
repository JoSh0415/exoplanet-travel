import { PrismaClient } from "@prisma/client";

const createPrismaClient = () => {
  if (process.env.NODE_ENV === "test") {
    if (process.env.TEST_DATABASE_URL) {
      return new PrismaClient({
        datasources: {
          db: {
            url: process.env.TEST_DATABASE_URL,
          },
        },
      });
    }
  }
  return new PrismaClient();
};

export const prisma = createPrismaClient();

export async function resetDb() {
  if (process.env.NODE_ENV === "test" && !process.env.TEST_DATABASE_URL) {
    throw new Error(
      "Test environment detected but TEST_DATABASE_URL is missing. " +
      "Please set TEST_DATABASE_URL in your .env file to prevent wiping the development database."
    );
  }
  
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();
  await prisma.exoplanet.deleteMany();
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
    },
  });

  return { planet, user };
}
