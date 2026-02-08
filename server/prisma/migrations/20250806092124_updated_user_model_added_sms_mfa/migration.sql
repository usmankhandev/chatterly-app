-- AlterTable
ALTER TABLE "User" ADD COLUMN     "smsMfaCode" TEXT,
ADD COLUMN     "smsMfaCodeExpires" TIMESTAMP(3);
