-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voidedByAdminId" TEXT;
