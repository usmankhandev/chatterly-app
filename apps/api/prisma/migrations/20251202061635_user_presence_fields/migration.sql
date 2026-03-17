-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeCallId" TEXT,
ADD COLUMN     "currentSocketIds" JSONB,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "presenceMeta" JSONB;

-- CreateIndex
CREATE INDEX "User_isOnline_lastSeen_idx" ON "User"("isOnline", "lastSeen");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
