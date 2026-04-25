-- DropIndex
DROP INDEX "Quiz_isPublished_idx";

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "lessonId" TEXT;

-- CreateIndex
CREATE INDEX "Quiz_lessonId_idx" ON "Quiz"("lessonId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
