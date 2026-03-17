-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('POST', 'COMMENT', 'USER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'REPLY_COMMENT';
ALTER TYPE "NotificationType" ADD VALUE 'MENTION';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" "EntityType",
ADD COLUMN     "message" TEXT,
ADD COLUMN     "metaData" JSONB;
