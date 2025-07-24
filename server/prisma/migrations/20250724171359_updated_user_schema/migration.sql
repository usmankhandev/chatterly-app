/*
  Warnings:

  - You are about to drop the column `emailVerificationExprires` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerificationExprires",
ADD COLUMN     "emailVerificationExpires" TEXT;
