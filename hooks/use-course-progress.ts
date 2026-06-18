// hooks\use-course-progress.ts
import { useMemo } from "react";

interface LessonProgress {
  completed: boolean;
}

interface Lesson {
  lessonProgress: LessonProgress[]; 
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

        // Check if the array has an entry and if it's completed
        if (lesson.lessonProgress?.length > 0 && lesson.lessonProgress[0].completed) {
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
