-- DropIndex
DROP INDEX "Message_roomId_createdAt_idx";

-- CreateIndex
CREATE INDEX "Message_roomId_createdAt_idx" ON "Message"("roomId", "createdAt" DESC);
