/*
  Warnings:

  - You are about to drop the column `interests` on the `User` table. All the data in the column will be lost.
  - Made the column `education` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "interests",
ADD COLUMN     "experience" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "education" SET NOT NULL,
ALTER COLUMN "skills" DROP DEFAULT;
