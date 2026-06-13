-- AlterTable
ALTER TABLE "user" ADD COLUMN     "communityBanned" BOOLEAN,
ADD COLUMN     "communityBanReason" TEXT,
ADD COLUMN     "communityBanExpires" TIMESTAMP(3),
ADD COLUMN     "healthGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dietaryFocus" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "completedAt" TIMESTAMP(3);
