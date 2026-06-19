import type { MigrationState } from "./state";

export function collectQuizIdsFromSteps(
  state: MigrationState
): Map<number, { courseId: string; chapterId?: string }> {
  const map = new Map<number, { courseId: string; chapterId?: string }>();

  for (const wpCourse of state.wpCourses) {
    const njCourseId = state.courseMap[wpCourse.id];
    if (!njCourseId) continue;

    const steps = state.wpStepTrees[wpCourse.id];
    if (!steps?.h) continue;

    const lessons = steps.h["sfwd-lessons"] ?? {};
    for (const lessonIdStr of Object.keys(lessons)) {
      const wpLessonId = parseInt(lessonIdStr, 10);
      const njChapterId = state.chapterMap[wpLessonId];
      const lessonNode = lessons[lessonIdStr];

      const lessonQuizzes = lessonNode?.["sfwd-quiz"] ?? {};
      for (const quizIdStr of Object.keys(lessonQuizzes)) {
        map.set(parseInt(quizIdStr, 10), {
          courseId: njCourseId,
          chapterId: njChapterId,
        });
      }

      const topics = lessonNode?.["sfwd-topic"] ?? {};
      for (const topicIdStr of Object.keys(topics)) {
        const topicNode = topics[topicIdStr];
        const topicQuizzes = topicNode?.["sfwd-quiz"] ?? {};
        for (const quizIdStr of Object.keys(topicQuizzes)) {
          map.set(parseInt(quizIdStr, 10), {
            courseId: njCourseId,
            chapterId: njChapterId,
          });
        }
      }
    }

    const courseQuizzes = steps.h["sfwd-quiz"] ?? {};
    for (const quizIdStr of Object.keys(courseQuizzes)) {
      map.set(parseInt(quizIdStr, 10), { courseId: njCourseId });
    }
  }

  return map;
}
