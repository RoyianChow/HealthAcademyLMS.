// app/actions/database/back-up-data.ts
"use server";

// Alternative terminal back-up command:
// & "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --clean --if-exists --no-owner --no-privileges -f "full_transfer_utf8.sql" "your_current_db_string"

import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";
import { PrismaClient } from "@/src/generated/prisma/client";

const CHUNK_SIZE = 100;

export async function backupDatabaseAction(targetDbString: string) {
  const startTime = Date.now();
  
  try {
    const sessionResponse = await authClient.getSession({
      fetchOptions: { headers: await headers() },
    });

    const session = sessionResponse?.data;
    if (!session || !session.user || session.user.role !== "admin") {
      return { success: false, message: "Forbidden: Admin privileges are required." };
    }

    if (!targetDbString.startsWith("postgres") && !targetDbString.startsWith("mysql")) {
      return { success: false, message: "Invalid connection string format." };
    }

    const prismaBackup = new PrismaClient({
      datasources: { db: { url: targetDbString } },
    });

    const counts = {
      verifications: 0, users: 0, accounts: 0, courses: 0,
      chapters: 0, lessons: 0, videos: 0, documents: 0, enrollments: 0,
      courseProgress: 0, lessonProgress: 0, quizzes: 0, questions: 0,
      options: 0, attempts: 0, answers: 0, posts: 0, comments: 0, likes: 0
    };

    // =================================================================
    // LAYER 1: Core Independent Nodes
    // =================================================================

    // 1. Verification Records
    const allVerifications = await prisma.verification.findMany();
    for (const v of allVerifications) {
      await prismaBackup.verification.upsert({
        where: { id: v.id },
        update: { ...v },
        create: v,
      });
      counts.verifications++;
    }

    // 2. Users
    const allUsers = await prisma.user.findMany();
    for (const user of allUsers) {
      const existingUser = await prismaBackup.user.findFirst({
        where: { OR: [{ id: user.id }, { email: user.email }] }
      });

      if (existingUser) {
        await prismaBackup.user.update({
          where: { id: existingUser.id },
          data: { ...user, id: user.id },
        });
      } else {
        await prismaBackup.user.create({ data: user });
      }
      counts.users++;
    }

    // 3. Courses
    const allCourses = await prisma.course.findMany();
    for (const course of allCourses) {
      await prismaBackup.course.upsert({
        where: { id: course.id },
        update: { ...course },
        create: course,
      });
      counts.courses++;
    }

    // =================================================================
    // LAYER 2: Primary Children (Auth States & Content Segments)
    // =================================================================

    // 4. Accounts
    const allAccounts = await prisma.account.findMany();
    for (const account of allAccounts) {
      await prismaBackup.account.upsert({
        where: { id: account.id },
        update: { ...account },
        create: account,
      });
      counts.accounts++;
    }

    // 5. Chapters
    const allChapters = await prisma.chapter.findMany();
    for (const chapter of allChapters) {
      await prismaBackup.chapter.upsert({
        where: { id: chapter.id },
        update: { ...chapter },
        create: chapter,
      });
      counts.chapters++;
    }

    // 6. Enrollments
    const allEnrollments = await prisma.enrollment.findMany();
    for (const enrollment of allEnrollments) {
      await prismaBackup.enrollment.upsert({
        where: { id: enrollment.id },
        update: { ...enrollment },
        create: enrollment,
      });
      counts.enrollments++;
    }

    // 7. Course Progress
    const allCourseProgress = await prisma.courseProgress.findMany();
    for (const cp of allCourseProgress) {
      await prismaBackup.courseProgress.upsert({
        where: { id: cp.id },
        update: { ...cp },
        create: cp,
      });
      counts.courseProgress++;
    }

    // =================================================================
    // LAYER 3: Secondary Children (Lessons, Quizzes & Forums)
    // =================================================================

    // 8. Lessons
    const allLessons = await prisma.lesson.findMany();
    for (const lesson of allLessons) {
      await prismaBackup.lesson.upsert({
        where: { id: lesson.id },
        update: { ...lesson },
        create: lesson,
      });
      counts.lessons++;
    }

    // 9. Quizzes
    const allQuizzes = await prisma.quiz.findMany();
    for (const quiz of allQuizzes) {
      await prismaBackup.quiz.upsert({
        where: { id: quiz.id },
        update: { ...quiz },
        create: quiz,
      });
      counts.quizzes++;
    }

    // 10. Community Posts
    const allPosts = await prisma.communityPost.findMany();
    for (const post of allPosts) {
      await prismaBackup.communityPost.upsert({
        where: { id: post.id },
        update: { ...post },
        create: post,
      });
      counts.posts++;
    }

    // =================================================================
    // LAYER 4: Deep Interconnected Leaves (Using Chunked Network Operations)
    // =================================================================

    async function processInChunks<T>(
      items: T[], 
      processor: (chunk: T[]) => Promise<void>
    ) {
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        // Enforce basic timeout check for Vercel Serverless environment runtime safety limits
        if (Date.now() - startTime > 280000) { // 4.6 minutes safety barrier
          throw new Error("Execution Timeout Imminent: Aborting process to avoid unhandled midway state corruption.");
        }
        const chunk = items.slice(i, i + CHUNK_SIZE);
        await processor(chunk);
      }
    }

    // 11. Lesson Videos
    const allVideos = await prisma.lessonVideo.findMany();
    await processInChunks(allVideos, async (chunk) => {
      await Promise.all(chunk.map(v => prismaBackup.lessonVideo.upsert({ where: { id: v.id }, update: { ...v }, create: v })));
      counts.videos += chunk.length;
    });

    // 12. Lesson Documents
    const allDocs = await prisma.lessonDocument.findMany();
    await processInChunks(allDocs, async (chunk) => {
      await Promise.all(chunk.map(d => prismaBackup.lessonDocument.upsert({ where: { id: d.id }, update: { ...d }, create: d })));
      counts.documents += chunk.length;
    });

    // 13. Lesson Progress
    const allLessonProgress = await prisma.lessonProgress.findMany();
    await processInChunks(allLessonProgress, async (chunk) => {
      await Promise.all(chunk.map(lp => prismaBackup.lessonProgress.upsert({ where: { id: lp.id }, update: { ...lp }, create: lp })));
      counts.lessonProgress += chunk.length;
    });

    // 14. Quiz Questions
    const allQuestions = await prisma.quizQuestion.findMany();
    await processInChunks(allQuestions, async (chunk) => {
      await Promise.all(chunk.map(q => prismaBackup.quizQuestion.upsert({ where: { id: q.id }, update: { ...q }, create: q })));
      counts.questions += chunk.length;
    });

    // 15. Quiz Attempts
    const allAttempts = await prisma.quizAttempt.findMany();
    await processInChunks(allAttempts, async (chunk) => {
      await Promise.all(chunk.map(a => prismaBackup.quizAttempt.upsert({ where: { id: a.id }, update: { ...a }, create: a })));
      counts.attempts += chunk.length;
    });

    // 16. Community Comments
    const allComments = await prisma.communityComment.findMany();
    await processInChunks(allComments, async (chunk) => {
      await Promise.all(chunk.map(c => prismaBackup.communityComment.upsert({ where: { id: c.id }, update: { ...c }, create: c })));
      counts.comments += chunk.length;
    });

    // 17. Community Likes
    const allLikes = await prisma.communityLike.findMany();
    await processInChunks(allLikes, async (chunk) => {
      await Promise.all(chunk.map(l => prismaBackup.communityLike.upsert({ where: { id: l.id }, update: { ...l }, create: l })));
      counts.likes += chunk.length;
    });

    // 18. Quiz Options
    const allOptions = await prisma.quizOption.findMany();
    await processInChunks(allOptions, async (chunk) => {
      await Promise.all(chunk.map(o => prismaBackup.quizOption.upsert({ where: { id: o.id }, update: { ...o }, create: o })));
      counts.options += chunk.length;
    });

    // 19. Quiz Answers
    const allAnswers = await prisma.quizAnswer.findMany();
    await processInChunks(allAnswers, async (chunk) => {
      await Promise.all(chunk.map(an => prismaBackup.quizAnswer.upsert({ where: { id: an.id }, update: { ...an }, create: an })));
      counts.answers += chunk.length;
    });

    await prismaBackup.$disconnect();

    return {
      success: true,
      message: `✅ Backup Complete! Cloned: ${counts.users} Users, ${counts.courses} Courses, ${counts.lessons} Lessons, and nested sub-relations successfully.`,
    };

  } catch (error: any) {
    console.error("Backup process failure:", error);
    return { 
      success: false, 
      message: `Backup failed: ${error.message || "Ensure your server settings match the structural schema requirements."}` 
    };
  }
}
