/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('GOOGLE', 'GITHUB', 'FACEBOOK', 'TWITTER', 'LINKEDIN', 'APPLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "MfaType" AS ENUM ('TOTP', 'SMS', 'EMAIL', 'BACK_CODES', 'HARDWARE_KEY', 'PUSH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "UserStatus" ADD VALUE 'LOCKED';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "accountStatus" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "backupCodes" JSONB,
ADD COLUMN     "emailVerificationExprires" TEXT,
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "failedLoginAttempts" JSONB,
ADD COLUMN     "jwtVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastKnownIp" TEXT,
ADD COLUMN     "lastKnownLocation" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastPasswordChange" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaMethods" "MfaType"[],
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "passwordHistory" JSONB,
ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "passwordSalt" TEXT,
ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "refreshTokenExpires" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT,
ADD COLUMN     "securityEvents" JSONB,
ADD COLUMN     "sessionMetadata" JSONB,
ADD COLUMN     "smsPhone" TEXT,
ADD COLUMN     "trustedDevices" JSONB,
ADD COLUMN     "twoFactorBackupUsed" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpires" TIMESTAMP(3),
    "scope" TEXT,
    "providerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE INDEX "SocialAccount_provider_idx" ON "SocialAccount"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerAccountId_key" ON "SocialAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_provider_key" ON "SocialAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "User_passwordResetToken_idx" ON "User"("passwordResetToken");

-- CreateIndex
CREATE INDEX "User_emailVerificationToken_idx" ON "User"("emailVerificationToken");

-- CreateIndex
CREATE INDEX "User_accountStatus_createdAt_idx" ON "User"("accountStatus", "createdAt");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE INDEX "User_mfaEnabled_accountStatus_idx" ON "User"("mfaEnabled", "accountStatus");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
