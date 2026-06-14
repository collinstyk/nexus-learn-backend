/*
  Warnings:

  - Added the required column `action` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ActivityLog_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "subjectId" TEXT;

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_subjectId_idx" ON "ActivityLog"("subjectId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
