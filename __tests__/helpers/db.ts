import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function resetDb() {
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
