/**
 * Unit tests — submitQuizAttempt grading edge cases
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    quizAttempt: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    quizAnswer: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn().mockResolvedValue(undefined),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { submitQuizAttempt } from "@/app/quizzes/[quizId]/action";

const mockGetSession = vi.mocked(auth.api.getSession);

const USER_SESSION = {
  user: {
    id: "user-123",
    name: "Regular User",
    email: "user@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    role: "user",
    banned: false,
    banReason: null,
    banExpires: null,
  },
  session: {
    id: "session-abc",
    userId: "user-123",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    token: "tok",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

const Q1 = "11111111-1111-4111-8111-111111111111";
const Q2 = "22222222-2222-4222-8222-222222222222";
const Q3 = "33333333-3333-4333-8333-333333333333";
const Q4 = "44444444-4444-4444-8444-444444444444";

const OPT = {
  q1Correct: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  q1Wrong: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  q2Correct: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  q2Wrong: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  q3Correct: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  q3Wrong: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  q4Correct: "99999999-9999-4999-8999-999999999999",
  q4Wrong: "88888888-8888-4888-8888-888888888888",
};

function makeQuestion(
  id: string,
  position: number,
  correctId: string,
  wrongId: string
) {
  return {
    id,
    position,
    options: [
      { id: correctId, position: 1, isCorrect: true },
      { id: wrongId, position: 2, isCorrect: false },
    ],
  };
}

function mockAttempt(params: {
  passingScore?: number | null;
  timeLimitMinutes?: number | null;
  createdAt?: Date;
  questions?: ReturnType<typeof makeQuestion>[];
}) {
  const questions = params.questions ?? [
    makeQuestion(Q1, 1, OPT.q1Correct, OPT.q1Wrong),
    makeQuestion(Q2, 2, OPT.q2Correct, OPT.q2Wrong),
    makeQuestion(Q3, 3, OPT.q3Correct, OPT.q3Wrong),
    makeQuestion(Q4, 4, OPT.q4Correct, OPT.q4Wrong),
  ];

  vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue({
    id: "attempt-1",
    quizId: "quiz-1",
    userId: "user-123",
    isComplete: false,
    createdAt: params.createdAt ?? new Date("2026-01-01T12:00:00Z"),
    quiz: {
      id: "quiz-1",
      passingScore: params.passingScore ?? 50,
      timeLimitMinutes: params.timeLimitMinutes ?? null,
      questions,
    },
  } as never);
}

describe("submitQuizAttempt — scoring edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.quizAnswer.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.quizAnswer.createMany).mockResolvedValue({ count: 4 } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);
  });

  it("scores 100% and passes when all answers are correct", async () => {
    mockAttempt({ passingScore: 50 });

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [
        { questionId: Q1, selectedOptionId: OPT.q1Correct },
        { questionId: Q2, selectedOptionId: OPT.q2Correct },
        { questionId: Q3, selectedOptionId: OPT.q3Correct },
        { questionId: Q4, selectedOptionId: OPT.q4Correct },
      ],
    });

    expect(result).toMatchObject({
      status: "success",
      score: 100,
      passed: true,
      totalQuestions: 4,
    });
  });

  it("scores 0% and fails when all answers are wrong", async () => {
    mockAttempt({ passingScore: 50 });

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [
        { questionId: Q1, selectedOptionId: OPT.q1Wrong },
        { questionId: Q2, selectedOptionId: OPT.q2Wrong },
        { questionId: Q3, selectedOptionId: OPT.q3Wrong },
        { questionId: Q4, selectedOptionId: OPT.q4Wrong },
      ],
    });

    expect(result).toMatchObject({
      status: "success",
      score: 0,
      passed: false,
      totalQuestions: 4,
    });
  });

  it("scores 50% and passes when half are correct and passingScore is 50", async () => {
    mockAttempt({ passingScore: 50 });

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [
        { questionId: Q1, selectedOptionId: OPT.q1Correct },
        { questionId: Q2, selectedOptionId: OPT.q2Correct },
        { questionId: Q3, selectedOptionId: OPT.q3Wrong },
        { questionId: Q4, selectedOptionId: OPT.q4Wrong },
      ],
    });

    expect(result).toMatchObject({
      status: "success",
      score: 50,
      passed: true,
      totalQuestions: 4,
    });
  });

  it("scores 50% and fails when passingScore is above 50", async () => {
    mockAttempt({ passingScore: 75 });

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [
        { questionId: Q1, selectedOptionId: OPT.q1Correct },
        { questionId: Q2, selectedOptionId: OPT.q2Correct },
        { questionId: Q3, selectedOptionId: OPT.q3Wrong },
        { questionId: Q4, selectedOptionId: OPT.q4Wrong },
      ],
    });

    expect(result).toMatchObject({
      status: "success",
      score: 50,
      passed: false,
    });
  });

  it("passes with 0% when passingScore is 0", async () => {
    mockAttempt({ passingScore: 0 });

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [
        { questionId: Q1, selectedOptionId: OPT.q1Wrong },
        { questionId: Q2, selectedOptionId: OPT.q2Wrong },
        { questionId: Q3, selectedOptionId: OPT.q3Wrong },
        { questionId: Q4, selectedOptionId: OPT.q4Wrong },
      ],
    });

    expect(result).toMatchObject({
      status: "success",
      score: 0,
      passed: true,
    });
  });

  it("returns an error when the quiz has no questions", async () => {
    mockAttempt({ questions: [] });

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [],
    });

    expect(result).toEqual({
      status: "error",
      message: "This quiz has no questions.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("expires the attempt without grading when the time limit is exceeded", async () => {
    mockAttempt({
      timeLimitMinutes: 30,
      createdAt: new Date(Date.now() - 31 * 60 * 1000),
    });

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [
        { questionId: Q1, selectedOptionId: OPT.q1Correct },
        { questionId: Q2, selectedOptionId: OPT.q2Correct },
        { questionId: Q3, selectedOptionId: OPT.q3Correct },
        { questionId: Q4, selectedOptionId: OPT.q4Correct },
      ],
    });

    expect(result).toMatchObject({
      status: "success",
      message: "Time limit severely exceeded. This attempt has expired.",
      score: 0,
      passed: false,
      totalQuestions: 4,
      answers: [],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.quizAnswer.createMany).not.toHaveBeenCalled();
  });
});
