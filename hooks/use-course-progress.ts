import { useMemo } from "react";

interface Lesson {
  lessonProgress: boolean;
}

interface Chapter {
  lessons: Lesson[];
}

interface CourseData {
  chapters: Chapter[];
}

export function useCourseProgress({ courseData }: { courseData: CourseData }) {
  return useMemo(() => {
    let totalLessons = 0;
    let completedLessons = 0;

    courseData.chapters.forEach((chapter) => {
      chapter.lessons.forEach((lesson) => {
        totalLessons++;

        if (lesson.lessonProgress) {
          completedLessons++;
        }
      });
    });

    const progressPercentage =
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100);

    return {
      totalLessons,
      completedLessons,
      progressPercentage,
    };
  }, [courseData]);
}