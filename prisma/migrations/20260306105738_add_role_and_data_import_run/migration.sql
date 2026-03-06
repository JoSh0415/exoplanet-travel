-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "DataImportRun" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "tapQuery" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "insertedCount" INTEGER NOT NULL,
    "updatedCount" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataImportRun_pkey" PRIMARY KEY ("id")
);
