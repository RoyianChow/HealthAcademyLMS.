// app/actions/database/compare-database.ts
"use server";

import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";
import { PrismaClient } from "@/src/generated/prisma/client";

export interface DatabaseDiff {
  model: string;
  identifier: string;
  status: string;
  variant: "warning" | "danger" | "info";
}

export async function compareDatabaseAction(externalDbString: string) {
  const startTime = Date.now();
  let prismaBackup: PrismaClient | null = null;

  try {
    // 1. Authenticate and enforce administrative privileges
    const sessionResponse = await authClient.getSession({
      fetchOptions: { headers: await headers() },
    });

    const session = sessionResponse?.data;
    if (!session || !session.user || session.user.role !== "admin") {
      return { success: false, message: "Forbidden: Admin privileges are required.", diffs: [] };
    }

    if (!externalDbString.startsWith("postgres") && !externalDbString.startsWith("mysql")) {
      return { success: false, message: "Invalid connection string format.", diffs: [] };
    }

    // 2. Initialize secondary connection pool
    prismaBackup = new PrismaClient({
      datasources: { db: { url: externalDbString } },
    });

    const diffs: DatabaseDiff[] = [];

    const getSnippet = (text: string | null | undefined, fallback: string) => {
      if (!text) return fallback;
      return text.length > 25 ? `${text.substring(0, 25)}...` : text;
    };

    console.log("⚡ Executing concurrent database fetch payload mapping...");

    // 3. Parallel Execution Engine: Fetch ALL data sets from BOTH databases at the same time
    const [
      // --- MAIN PRODUCTION DATABASE REPOSITORY ---
      mainCourses, mainChapters, mainLessons, mainVideos, mainDocs, mainQuizzes, mainQuestions, mainOptions, mainAnswers,
      // --- TARGET BACKUP ARCHIVE REPOSITORY ---
      backupCourses, backupChapters, backupLessons, backupVideos, backupDocs, backupQuizzes, backupQuestions, backupOptions, backupAnswers
    ] = await Promise.all([
      // Main DB Queries
      prisma.course.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prisma.chapter.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prisma.lesson.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prisma.lessonVideo.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prisma.lessonDocument.findMany({ select: { id: true, name: true, updatedAt: true } }),
      prisma.quiz.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prisma.quizQuestion.findMany({ select: { id: true, question: true, updatedAt: true } }),
      prisma.quizOption.findMany({ select: { id: true, text: true, updatedAt: true } }),
      prisma.quizAnswer.findMany({ select: { id: true, isCorrect: true, createdAt: true } }),

      // Backup DB Queries
      prismaBackup.course.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prismaBackup.chapter.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prismaBackup.lesson.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prismaBackup.lessonVideo.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prismaBackup.lessonDocument.findMany({ select: { id: true, name: true, updatedAt: true } }),
      prismaBackup.quiz.findMany({ select: { id: true, title: true, updatedAt: true } }),
      prismaBackup.quizQuestion.findMany({ select: { id: true, question: true, updatedAt: true } }),
      prismaBackup.quizOption.findMany({ select: { id: true, text: true, updatedAt: true } }),
      prismaBackup.quizAnswer.findMany({ select: { id: true, isCorrect: true, createdAt: true } }),
    ]);

    console.log(`📥 All tables fetched concurrently in ${(Date.now() - startTime) / 1000}s. Computing diffs...`);

    // 4. Structural Diffing Engine
    function computeModelDiff<T extends { id: string; updatedAt?: Date; createdAt?: Date }>(
      modelName: string,
      mainItems: T[],
      backupItems: T[],
      getLabel: (item: T) => string
    ) {
      const mainMap = new Map(mainItems.map((i) => [i.id, i]));
      const backupMap = new Map(backupItems.map((i) => [i.id, i]));

      for (const mu of mainItems) {
        const bu = backupMap.get(mu.id);
        const label = getLabel(mu);
        if (!bu) {
          diffs.push({ model: modelName, identifier: label, status: "Missing in Secondary DB", variant: "warning" });
        } else {
          const mainTime = mu.updatedAt?.getTime() ?? mu.createdAt?.getTime() ?? 0;
          const backupTime = bu.updatedAt?.getTime() ?? bu.createdAt?.getTime() ?? 0;
          
          if (mainTime !== backupTime) {
            diffs.push({ model: modelName, identifier: label, status: "Out of Sync", variant: "info" });
          }
        }
      }

      for (const bu of backupItems) {
        if (!mainMap.has(bu.id)) {
          diffs.push({ model: modelName, identifier: getLabel(bu), status: "Exists Only in Secondary DB", variant: "danger" });
        }
      }
    }

    // 5. Execute Uniform Diff Calculations
    computeModelDiff("Course", mainCourses, backupCourses, (c) => c.title);
    computeModelDiff("Chapter", mainChapters, backupChapters, (ch) => ch.title);
    computeModelDiff("Lesson", mainLessons, backupLessons, (l) => l.title);
    computeModelDiff("LessonVideo", mainVideos, backupVideos, (v) => v.title || `Video ID: ${v.id}`);
    computeModelDiff("LessonDocument", mainDocs, backupDocs, (d) => d.name);
    computeModelDiff("Quiz", mainQuizzes, backupQuizzes, (q) => q.title);
    computeModelDiff("QuizQuestion", mainQuestions, backupQuestions, (q) => getSnippet(q.question, q.id));
    computeModelDiff("QuizOption", mainOptions, backupOptions, (o) => getSnippet(o.text, o.id));
    computeModelDiff("QuizAnswer", mainAnswers, backupAnswers, (a) => `Answer ID: ${a.id} (Correctness: ${a.isCorrect})`);

    return { 
      success: true, 
      message: `Data comparison calculated successfully in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds.`, 
      diffs 
    };

  } catch (error: any) {
    console.error("Database alignment verification failed:", error);
    return { 
      success: false, 
      message: `Failed to verify database parameters: ${error.message || "Layout schemas are decoupled."}`, 
      diffs: [] 
    };
  } finally {
    if (prismaBackup) {
      await prismaBackup.$disconnect();
    }
  }
}
