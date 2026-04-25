/*
  Warnings:

  - You are about to drop the column `lessonId` on the `Quiz` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_lessonId_fkey";

-- DropIndex
DROP INDEX "Quiz_lessonId_idx";

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "lessonId",
ADD COLUMN     "chapterId" TEXT;

-- CreateIndex
CREATE INDEX "Quiz_chapterId_idx" ON "Quiz"("chapterId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
