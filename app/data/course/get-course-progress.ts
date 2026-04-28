import { useMemo } from "react";

interface CourseProgress {
  completed: boolean;
}

interface CourseData {
  courseProgress: CourseProgress[];
}

export function useCourseProgress({ courseData }: { courseData: CourseData }) {
  return useMemo(() => {
    const completed = courseData.courseProgress[0]?.completed ?? false;

    return {
      completed,
      progressPercentage: completed ? 100 : 0,
      completedLessons: completed ? 1 : 0,
      totalLessons: 1,
    };
  }, [courseData]);
}