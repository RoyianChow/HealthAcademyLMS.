-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single', 'multiple', 'essay', 'assessment');

-- AlterTable
ALTER TABLE "QuizAnswer" ADD COLUMN     "textResponse" TEXT;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'single';

-- CreateTable
CREATE TABLE "QuizAnswerSelection" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "QuizAnswerSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizAnswerSelection_answerId_idx" ON "QuizAnswerSelection"("answerId");

-- CreateIndex
CREATE INDEX "QuizAnswerSelection_optionId_idx" ON "QuizAnswerSelection"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswerSelection_answerId_optionId_key" ON "QuizAnswerSelection"("answerId", "optionId");

-- AddForeignKey
ALTER TABLE "QuizAnswerSelection" ADD CONSTRAINT "QuizAnswerSelection_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "QuizAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswerSelection" ADD CONSTRAINT "QuizAnswerSelection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuizOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
