-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Customer" ADD COLUMN "restoredAt" DATETIME;

-- CreateIndex
CREATE INDEX "Customer_isDeleted_createdAt_idx" ON "Customer"("isDeleted", "createdAt");
