import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prismaClientOptions =
  process.env.NODE_ENV === "test" && process.env.TEST_DATABASE_URL
    ? {
        datasources: {
          db: {
            url: process.env.TEST_DATABASE_URL,
          },
        },
      }
    : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
