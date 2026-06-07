// app/actions/database/restore-data.ts
"use server";

// Alternative terminal restore command:
// & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -f "full_transfer_utf8.sql" "your_backup_db_string"

import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";
import { PrismaClient } from "@/src/generated/prisma/client";

const CHUNK_SIZE = 100;

export async function restoreDatabaseAction(sourceDbString: string, mode: "sync" | "reset" = "sync") {
  const startTime = Date.now();
  
  try {
    // 1. Authenticate and authorize session
    const sessionResponse = await authClient.getSession({
      fetchOptions: { headers: await headers() },
    });

    const session = sessionResponse?.data;
    if (!session || !session.user || session.user.role !== "admin") {
      return { success: false, message: "Forbidden: Admin privileges are required." };
    }

    if (!sourceDbString.startsWith("postgres") && !sourceDbString.startsWith("mysql")) {
      return { success: false, message: "Invalid connection string format." };
    }

    // 2. Initialize secondary client
    const prismaBackup = new PrismaClient({
      datasources: { db: { url: sourceDbString } },
    });

    console.log(`📡 Connected to secondary database. Mode: ${mode.toUpperCase()}`);

    // =================================================================
    // PHASE 1: DESTRUCTIVE RESET (Wipe tables in precise reverse order)
    // =================================================================
    if (mode === "reset") {
      console.log("⚠️ Executing Destructive Reset: Clearing all tables...");
      
      // Tier 5
      await prisma.quizAnswer.deleteMany({});
      // Tier 4
      await prisma.quizOption.deleteMany({});
      // Tier 3
      await prisma.quizAttempt.deleteMany({});
      await prisma.quizQuestion.deleteMany({});
      await prisma.lessonProgress.deleteMany({});
      await prisma.lessonDocument.deleteMany({});
      await prisma.lessonVideo.deleteMany({});
      // Tier 2
      await prisma.communityLike.deleteMany({});
      await prisma.communityComment.deleteMany({});
      await prisma.quiz.deleteMany({});
      await prisma.lesson.deleteMany({});
      // Tier 1
      await prisma.communityPost.deleteMany({});
      await prisma.courseProgress.deleteMany({});
      await prisma.enrollment.deleteMany({});
      await prisma.chapter.deleteMany({});
      await prisma.account.deleteMany({});
      // Root Core
      await prisma.course.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.verification.deleteMany({});
    }

    // Tracker counts (Session dropped)
    const counts = {
      verifications: 0, users: 0, accounts: 0, courses: 0,
      chapters: 0, lessons: 0, videos: 0, documents: 0, enrollments: 0,
      courseProgress: 0, lessonProgress: 0, quizzes: 0, questions: 0,
      options: 0, attempts: 0, answers: 0, posts: 0, comments: 0, likes: 0
    };

    // =================================================================
    // LAYERED PROCESSOR: Chunking Engine for Highly Populated Tables
    // =================================================================
    async function processInChunks<T>(
      items: T[], 
      processor: (item: T) => Promise<void>
    ) {
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        // Enforce basic timeout check for Vercel Serverless environment runtime safety limits
        if (Date.now() - startTime > 280000) { // 4.6 minutes safety barrier
          throw new Error("Vercel Execution Timeout Imminent: Aborting process to avoid unhandled midway state corruption.");
        }
        const chunk = items.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(item => processor(item)));
      }
    }

    // =================================================================
    // PHASE 2: RESTORE DATA (In sequential dependency order)
    // =================================================================

    // 1. Verification (Independent Sequential)
    const backupVerifications = await prismaBackup.verification.findMany();
    for (const v of backupVerifications) {
      if (mode === "reset") {
        await prisma.verification.create({ data: v });
      } else {
        await prisma.verification.upsert({ where: { id: v.id }, update: { ...v }, create: v });
      }
      counts.verifications++;
    }

    // 2. User (Sequential due to precise conditional fallback cross-checks)
    const backupUsers = await prismaBackup.user.findMany();
    for (const u of backupUsers) {
      if (mode === "reset") {
        await prisma.user.create({ data: u });
      } else {
        const existing = await prisma.user.findFirst({
          where: { OR: [{ id: u.id }, { email: u.email }] }
        });
        if (existing) {
          await prisma.user.update({ where: { id: existing.id }, data: { ...u, id: u.id } });
        } else {
          await prisma.user.create({ data: u });
        }
      }
      counts.users++;
    }

    // 3. Course (Sequential)
    const backupCourses = await prismaBackup.course.findMany();
    for (const c of backupCourses) {
      if (mode === "reset") {
        await prisma.course.create({ data: c });
      } else {
        await prisma.course.upsert({ where: { id: c.id }, update: { ...c }, create: c });
      }
      counts.courses++;
    }

    // 4. Account (Sequential)
    const backupAccounts = await prismaBackup.account.findMany();
    for (const a of backupAccounts) {
      if (mode === "reset") {
        await prisma.account.create({ data: a });
      } else {
        await prisma.account.upsert({ where: { id: a.id }, update: { ...a }, create: a });
      }
      counts.accounts++;
    }

    // 5. Chapter (Sequential)
    const backupChapters = await prismaBackup.chapter.findMany();
    for (const ch of backupChapters) {
      if (mode === "reset") {
        await prisma.chapter.create({ data: ch });
      } else {
        await prisma.chapter.upsert({ where: { id: ch.id }, update: { ...ch }, create: ch });
      }
      counts.chapters++;
    }

    // 6. Lesson (Sequential)
    const backupLessons = await prismaBackup.lesson.findMany();
    for (const l of backupLessons) {
      if (mode === "reset") {
        await prisma.lesson.create({ data: l });
      } else {
        await prisma.lesson.upsert({ where: { id: l.id }, update: { ...l }, create: l });
      }
      counts.lessons++;
    }

    // 7. LessonVideo (Chunked Parallelized Restores)
    const backupVideos = await prismaBackup.lessonVideo.findMany();
    await processInChunks(backupVideos, async (lv) => {
      if (mode === "reset") {
        await prisma.lessonVideo.create({ data: lv });
      } else {
        await prisma.lessonVideo.upsert({ where: { id: lv.id }, update: { ...lv }, create: lv });
      }
    });
    counts.videos = backupVideos.length;

    // 8. LessonDocument (Chunked)
    const backupDocuments = await prismaBackup.lessonDocument.findMany();
    await processInChunks(backupDocuments, async (ld) => {
      if (mode === "reset") {
        await prisma.lessonDocument.create({ data: ld });
      } else {
        await prisma.lessonDocument.upsert({ where: { id: ld.id }, update: { ...ld }, create: ld });
      }
    });
    counts.documents = backupDocuments.length;

    // 9. Enrollment (Chunked)
    const backupEnrollments = await prismaBackup.enrollment.findMany();
    await processInChunks(backupEnrollments, async (e) => {
      if (mode === "reset") {
        await prisma.enrollment.create({ data: e });
      } else {
        await prisma.enrollment.upsert({ where: { id: e.id }, update: { ...e }, create: e });
      }
    });
    counts.enrollments = backupEnrollments.length;

    // 10. CourseProgress (Chunked)
    const backupCourseProg = await prismaBackup.courseProgress.findMany();
    await processInChunks(backupCourseProg, async (cp) => {
      if (mode === "reset") {
        await prisma.courseProgress.create({ data: cp });
      } else {
        await prisma.courseProgress.upsert({ where: { id: cp.id }, update: { ...cp }, create: cp });
      }
    });
    counts.courseProgress = backupCourseProg.length;

    // 11. LessonProgress (Chunked)
    const backupLessonProg = await prismaBackup.lessonProgress.findMany();
    await processInChunks(backupLessonProg, async (lp) => {
      if (mode === "reset") {
        await prisma.lessonProgress.create({ data: lp });
      } else {
        await prisma.lessonProgress.upsert({ where: { id: lp.id }, update: { ...lp }, create: lp });
      }
    });
    counts.lessonProgress = backupLessonProg.length;

    // 12. Quiz (Sequential)
    const backupQuizzes = await prismaBackup.quiz.findMany();
    for (const q of backupQuizzes) {
      if (mode === "reset") {
        await prisma.quiz.create({ data: q });
      } else {
        await prisma.quiz.upsert({ where: { id: q.id }, update: { ...q }, create: q });
      }
      counts.quizzes++;
    }

    // 13. QuizQuestion (Chunked)
    const backupQuestions = await prismaBackup.quizQuestion.findMany();
    await processInChunks(backupQuestions, async (qq) => {
      if (mode === "reset") {
        await prisma.quizQuestion.create({ data: qq });
      } else {
        await prisma.quizQuestion.upsert({ where: { id: qq.id }, update: { ...qq }, create: qq });
      }
    });
    counts.questions = backupQuestions.length;

    // 14. QuizOption (Chunked)
    const backupOptions = await prismaBackup.quizOption.findMany();
    await processInChunks(backupOptions, async (qo) => {
      if (mode === "reset") {
        await prisma.quizOption.create({ data: qo });
      } else {
        await prisma.quizOption.upsert({ where: { id: qo.id }, update: { ...qo }, create: qo });
      }
    });
    counts.options = backupOptions.length;

    // 15. QuizAttempt (Chunked)
    const backupAttempts = await prismaBackup.quizAttempt.findMany();
    await processInChunks(backupAttempts, async (qa) => {
      if (mode === "reset") {
        await prisma.quizAttempt.create({ data: qa });
      } else {
        await prisma.quizAttempt.upsert({ where: { id: qa.id }, update: { ...qa }, create: qa });
      }
    });
    counts.attempts = backupAttempts.length;

    // 16. QuizAnswer (Chunked)
    const backupAnswers = await prismaBackup.quizAnswer.findMany();
    await processInChunks(backupAnswers, async (qan) => {
      if (mode === "reset") {
        await prisma.quizAnswer.create({ data: qan });
      } else {
        await prisma.quizAnswer.upsert({ where: { id: qan.id }, update: { ...qan }, create: qan });
      }
    });
    counts.answers = backupAnswers.length;

    // 17. CommunityPost (Sequential)
    const backupPosts = await prismaBackup.communityPost.findMany();
    for (const cp of backupPosts) {
      if (mode === "reset") {
        await prisma.communityPost.create({ data: cp });
      } else {
        await prisma.communityPost.upsert({ where: { id: cp.id }, update: { ...cp }, create: cp });
      }
      counts.posts++;
    }

    // 18. CommunityComment (Chunked)
    const backupComments = await prismaBackup.communityComment.findMany();
    await processInChunks(backupComments, async (cc) => {
      if (mode === "reset") {
        await prisma.communityComment.create({ data: cc });
      } else {
        await prisma.communityComment.upsert({ where: { id: cc.id }, update: { ...cc }, create: cc });
      }
    });
    counts.comments = backupComments.length;

    // 19. CommunityLike (Chunked)
    const backupLikes = await prismaBackup.communityLike.findMany();
    await processInChunks(backupLikes, async (cl) => {
      if (mode === "reset") {
        await prisma.communityLike.create({ data: cl });
      } else {
        await prisma.communityLike.upsert({ where: { id: cl.id }, update: { ...cl }, create: cl });
      }
    });
    counts.likes = backupLikes.length;

    await prismaBackup.$disconnect();

    const modeText = mode === "reset" ? "Wiped and deep-restored" : "Merged-synchronized";
    return {
      success: true,
      message: `🎉 Complete Restore Success! ${modeText} all models: ${counts.users} Users, ${counts.courses} Courses, ${counts.quizzes} Quizzes, ${counts.questions} Questions, ${counts.posts} Posts, and ${counts.enrollments} Enrollments safely migrated.`,
    };

  } catch (error: any) {
    console.error("Deep restoration lifecycle catastrophic failure:", error);
    return { 
      success: false, 
      message: `Restoration failed: ${error.message || "Verification parameters or layout schemas are structurally mismatched."}` 
    };
  }
}
