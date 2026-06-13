/** Fixed IDs from prisma/seed-test.ts — keep in sync with the seed script. */
export const E2E_SEED = {
  adminUser: "admin-test-001",
  studentUser: "student-test-001",
  course: {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "test-nutrition-course",
    title: "Test Nutrition Course",
  },
  course2: {
    id: "00000000-0000-4000-8000-000000000010",
    slug: "test-advanced-nutrition",
    title: "Advanced Nutrition",
    enrollmentId: "00000000-0000-4000-8000-000000000011",
  },
  lesson: {
    id: "00000000-0000-4000-8000-000000000003",
  },
  quiz: {
    id: "00000000-0000-4000-8000-000000000005",
  },
  quizAnswers: {
    q1Correct: "Carbohydrates",
    q2Correct: "Amino acids",
  },
  stripeCustomerId: "cus_test_student_001",
} as const;
