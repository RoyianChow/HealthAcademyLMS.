import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const IDS = {
  adminUser: "admin-test-001",
  studentUser: "student-test-001",
  course: "00000000-0000-4000-8000-000000000001",
  chapter: "00000000-0000-4000-8000-000000000002",
  lesson: "00000000-0000-4000-8000-000000000003",
  enrollment: "00000000-0000-4000-8000-000000000004",
  quiz: "00000000-0000-4000-8000-000000000005",
  question1: "00000000-0000-4000-8000-000000000006",
  question2: "00000000-0000-4000-8000-000000000007",
  option1Correct: "00000000-0000-4000-8000-000000000008",
  option1Wrong: "00000000-0000-4000-8000-000000000009",
  option2Correct: "00000000-0000-4000-8000-00000000000a",
  option2Wrong: "00000000-0000-4000-8000-00000000000b",
  communityPost: "community-post-test-001",
  course2: "00000000-0000-4000-8000-000000000010",
  enrollment2: "00000000-0000-4000-8000-000000000011",
} as const;

const now = new Date("2026-01-01T00:00:00.000Z");

function tipTapDescription(text: string) {
  return JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });
}

async function seedUsers() {
  const userBase = {
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    banned: false,
    banReason: null,
    banExpires: null,
  };

  await prisma.user.upsert({
    where: { id: IDS.adminUser },
    create: {
      id: IDS.adminUser,
      name: "Test Admin",
      email: "admin@test.healthacademy.local",
      role: "admin",
      ...userBase,
    },
    update: {
      name: "Test Admin",
      email: "admin@test.healthacademy.local",
      role: "admin",
      updatedAt: now,
    },
  });

  await prisma.user.upsert({
    where: { id: IDS.studentUser },
    create: {
      id: IDS.studentUser,
      name: "Test Student",
      email: "student@test.healthacademy.local",
      role: "user",
      stripeCustomerId: "cus_test_student_001",
      ...userBase,
    },
    update: {
      name: "Test Student",
      email: "student@test.healthacademy.local",
      role: "user",
      stripeCustomerId: "cus_test_student_001",
      updatedAt: now,
    },
  });
}

async function seedCourse() {
  await prisma.course.upsert({
    where: { id: IDS.course },
    create: {
      id: IDS.course,
      title: "Test Nutrition Course",
      description: tipTapDescription(
        "A seeded course for integration and E2E tests."
      ),
      fileKey: "courses/test-course.pdf",
      price: 9900,
      duration: 10,
      level: "Beginner",
      stripePriceId: "price_test_nutrition_001",
      category: "Nutrition",
      smallDescription: "Seeded test course",
      slug: "test-nutrition-course",
      status: "Published",
      userId: IDS.adminUser,
      thumbnailKey: "courses/test-thumbnail.png",
    },
    update: {
      title: "Test Nutrition Course",
      status: "Published",
      updatedAt: now,
    },
  });

  await prisma.chapter.upsert({
    where: { id: IDS.chapter },
    create: {
      id: IDS.chapter,
      title: "Chapter 1: Foundations",
      position: 1,
      courseId: IDS.course,
    },
    update: {
      title: "Chapter 1: Foundations",
      position: 1,
    },
  });

  await prisma.lesson.upsert({
    where: { id: IDS.lesson },
    create: {
      id: IDS.lesson,
      title: "Lesson 1: Macronutrients",
      description: "Introduction to proteins, fats, and carbohydrates.",
      position: 1,
      chapterId: IDS.chapter,
      content: "<p>Macronutrients are the building blocks of nutrition.</p>",
      isFreePreview: true,
      isPublished: true,
    },
    update: {
      title: "Lesson 1: Macronutrients",
      isFreePreview: true,
      isPublished: true,
    },
  });
}

async function seedEnrollmentCourse() {
  await prisma.enrollment.upsert({
    where: { id: IDS.enrollment },
    create: {
      id: IDS.enrollment,
      amount: 9900,
      status: "Active",
      courseId: IDS.course,
      userId: IDS.studentUser,
      purchasedAt: now,
      stripePaymentId: "pi_test_001",
      stripeSessionId: "cs_test_001",
    },
    update: {
      status: "Active",
      amount: 9900,
      updatedAt: now,
    },
  });
}

async function seedSecondCourse() {
  await prisma.course.upsert({
    where: { id: IDS.course2 },
    create: {
      id: IDS.course2,
      title: "Advanced Nutrition",
      description: tipTapDescription(
        "A second seeded course for enrollment E2E tests."
      ),
      fileKey: "courses/test-advanced-course.pdf",
      price: 14900,
      duration: 12,
      level: "Intermediate",
      stripePriceId: "price_test_advanced_001",
      category: "Nutrition",
      smallDescription: "Enrollment E2E course",
      slug: "test-advanced-nutrition",
      status: "Published",
      userId: IDS.adminUser,
      thumbnailKey: "courses/test-advanced-thumbnail.png",
    },
    update: {
      title: "Advanced Nutrition",
      status: "Published",
      updatedAt: now,
    },
  });
}

async function seedQuiz() {
  await prisma.quiz.upsert({
    where: { id: IDS.quiz },
    create: {
      id: IDS.quiz,
      title: "Chapter 1 Quiz",
      description: "Test your knowledge of macronutrients.",
      isPublished: true,
      courseId: IDS.course,
      chapterId: IDS.chapter,
      allowMultipleAttempts: false,
      passingScore: 50,
      timeLimitMinutes: 30,
    },
    update: {
      title: "Chapter 1 Quiz",
      isPublished: true,
      passingScore: 50,
    },
  });

  await prisma.quizQuestion.upsert({
    where: { id: IDS.question1 },
    create: {
      id: IDS.question1,
      question: "Which macronutrient is a primary energy source?",
      position: 1,
      quizId: IDS.quiz,
    },
    update: {
      question: "Which macronutrient is a primary energy source?",
      position: 1,
    },
  });

  await prisma.quizQuestion.upsert({
    where: { id: IDS.question2 },
    create: {
      id: IDS.question2,
      question: "Protein is made of which building blocks?",
      position: 2,
      quizId: IDS.quiz,
    },
    update: {
      question: "Protein is made of which building blocks?",
      position: 2,
    },
  });

  await prisma.quizOption.upsert({
    where: { id: IDS.option1Correct },
    create: {
      id: IDS.option1Correct,
      text: "Carbohydrates",
      isCorrect: true,
      position: 1,
      questionId: IDS.question1,
    },
    update: { text: "Carbohydrates", isCorrect: true, position: 1 },
  });

  await prisma.quizOption.upsert({
    where: { id: IDS.option1Wrong },
    create: {
      id: IDS.option1Wrong,
      text: "Vitamins",
      isCorrect: false,
      position: 2,
      questionId: IDS.question1,
    },
    update: { text: "Vitamins", isCorrect: false, position: 2 },
  });

  await prisma.quizOption.upsert({
    where: { id: IDS.option2Correct },
    create: {
      id: IDS.option2Correct,
      text: "Amino acids",
      isCorrect: true,
      position: 1,
      questionId: IDS.question2,
    },
    update: { text: "Amino acids", isCorrect: true, position: 1 },
  });

  await prisma.quizOption.upsert({
    where: { id: IDS.option2Wrong },
    create: {
      id: IDS.option2Wrong,
      text: "Fatty acids",
      isCorrect: false,
      position: 2,
      questionId: IDS.question2,
    },
    update: { text: "Fatty acids", isCorrect: false, position: 2 },
  });
}

async function seedCommunityPost() {
  await prisma.communityPost.upsert({
    where: { id: IDS.communityPost },
    create: {
      id: IDS.communityPost,
      content: "Excited to start learning about nutrition!",
      userId: IDS.studentUser,
      courseId: IDS.course,
      isPinned: false,
    },
    update: {
      content: "Excited to start learning about nutrition!",
      updatedAt: now,
    },
  });
}

async function main() {
  await seedUsers();
  await seedCourse();
  await seedSecondCourse();
  await seedEnrollmentCourse();
  await seedQuiz();
  await seedCommunityPost();
  console.log("Test database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to seed test database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { IDS as TEST_SEED_IDS };
