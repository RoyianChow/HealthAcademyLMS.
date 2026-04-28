import "server-only";

import { mockCourses } from "@/data/mock-chat-data";
import type {
  ChatBootstrapCourseSummary,
  ChatCourse,
  ChatUserContext,
  RelevantCourseExcerpt,
} from "@/lib/chat/types";

const stopWords = new Set([
  "about",
  "after",
  "before",
  "could",
  "from",
  "have",
  "that",
  "their",
  "there",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
]);

export async function getAccessibleCoursesForUser(
  user: ChatUserContext
): Promise<ChatCourse[]> {
  return mockCourses.filter((course) => user.enrolledCourseIds.includes(course.id));
}

export function buildCourseSummaries(
  courses: ChatCourse[]
): ChatBootstrapCourseSummary[] {
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    progressLabel: course.progress
      ? `${course.progress.percentage}% complete`
      : "Not started",
  }));
}

export function findRelevantCourseExcerpts(params: {
  question: string;
  accessibleCourses: ChatCourse[];
  activeCourseId: string | null;
}) {
  const keywords = tokenizeQuestion(params.question);
  const scopedCourses =
    params.activeCourseId == null
      ? params.accessibleCourses
      : params.accessibleCourses.filter((course) => course.id === params.activeCourseId);

  const matches: RelevantCourseExcerpt[] = [];

  for (const course of scopedCourses) {
    const courseText = [
      course.title,
      course.description,
      course.smallDescription,
      course.category,
      course.searchableTerms?.join(" "),
    ]
      .filter(Boolean)
      .join(" ");

    const courseScore = scoreText(courseText, keywords);

    if (courseScore > 0) {
      matches.push({
        courseId: course.id,
        courseTitle: course.title,
        excerpt: `${course.smallDescription} ${course.description}`,
        score: courseScore,
      });
    }

    for (const chapter of course.chapters) {
      for (const lesson of chapter.lessons) {
        const lessonText = [
          course.title,
          chapter.title,
          lesson.title,
          lesson.description,
          lesson.keywords?.join(" "),
        ]
          .filter(Boolean)
          .join(" ");

        const lessonScore = scoreText(lessonText, keywords);

        if (lessonScore > 0) {
          matches.push({
            courseId: course.id,
            courseTitle: course.title,
            chapterTitle: chapter.title,
            lessonTitle: lesson.title,
            excerpt: lesson.description ?? lesson.title,
            score: lessonScore + 2,
          });
        }
      }
    }
  }

  return matches.sort((left, right) => right.score - left.score).slice(0, 3);
}

function tokenizeQuestion(question: string) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function scoreText(text: string, keywords: string[]) {
  const searchable = text.toLowerCase();

  return keywords.reduce((score, keyword) => {
    if (!searchable.includes(keyword)) return score;
    return score + Math.max(1, searchable.split(keyword).length - 1);
  }, 0);
}
