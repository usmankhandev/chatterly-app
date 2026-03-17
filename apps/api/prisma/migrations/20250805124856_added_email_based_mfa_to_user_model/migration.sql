-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailMfaCode" TEXT,
ADD COLUMN     "emailMfaCodeExpires" TIMESTAMP(3);
