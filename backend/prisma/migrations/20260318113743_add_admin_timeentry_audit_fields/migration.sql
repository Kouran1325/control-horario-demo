-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "createReason" TEXT,
ADD COLUMN     "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "editReason" TEXT,
ADD COLUMN     "editedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editedByAdminId" TEXT,
ADD COLUMN     "entryMethod" TEXT NOT NULL DEFAULT 'USER';
