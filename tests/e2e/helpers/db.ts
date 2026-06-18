import { PrismaClient } from "../../../src/generated/prisma/client";
import { E2E_SEED } from "../fixtures/seed-ids";

const globalForPrisma = globalThis as unknown as { e2ePrisma?: PrismaClient };

export const e2ePrisma =
  globalForPrisma.e2ePrisma ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.e2ePrisma = e2ePrisma;
}

export async function createPendingEnrollmentForCourse2() {
  return e2ePrisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: E2E_SEED.studentUser,
        courseId: E2E_SEED.course2.id,
      },
    },
    create: {
      id: E2E_SEED.course2.enrollmentId,
      userId: E2E_SEED.studentUser,
      courseId: E2E_SEED.course2.id,
      amount: 14900,
      status: "Pending",
    },
    update: {
      status: "Pending",
      amount: 14900,
      updatedAt: new Date(),
    },
  });
}

export async function removeEnrollmentForCourse2() {
  await e2ePrisma.enrollment.deleteMany({
    where: {
      userId: E2E_SEED.studentUser,
      courseId: E2E_SEED.course2.id,
    },
  });
}

export async function getLatestQuizAttempt(quizId: string, userId: string) {
  return e2ePrisma.quizAttempt.findFirst({
    where: { quizId, userId },
    orderBy: { createdAt: "desc" },
  });
}
