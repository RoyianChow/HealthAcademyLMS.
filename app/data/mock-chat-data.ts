import type { ChatCourse, ChatUserContext } from "@/lib/chat/types";

export const mockUsers: ChatUserContext[] = [
  {
    id: "user-alex",
    name: "Alex Morgan",
    email: "alex@example.com",
    goals: ["Build steadier energy", "Create a realistic meal rhythm"],
    dietaryFocus: ["Protein balance", "Meal timing"],
    enrolledCourseIds: ["course-ultimate-nutrition", "course-gut-health"],
    notes:
      "Prefers practical guidance, short action steps, and examples tied to course content.",
  },
  {
    id: "user-jordan",
    name: "Jordan Lee",
    email: "jordan@example.com",
    goals: ["Improve recovery", "Understand sports nutrition basics"],
    dietaryFocus: ["Hydration", "Post-workout meals"],
    enrolledCourseIds: ["course-sports-fueling"],
    notes:
      "Likes concise answers and quick references to lesson structure.",
  },
];

export const mockCourses: ChatCourse[] = [
  {
    id: "course-ultimate-nutrition",
    title: "Ultimate Nutrition Mastery",
    slug: "ultimate-nutrition-mastery",
    description:
      "A foundational program covering balanced eating, macronutrients, meal planning, and sustainable nutrition habits.",
    smallDescription: "Core nutrition principles and sustainable habits.",
    category: "Foundations",
    level: "BEGINNER",
    duration: 8,
    status: "PUBLISHED",
    progress: {
      percentage: 62,
      completedLessons: 5,
      totalLessons: 8,
      isCompleted: false,
    },
    searchableTerms: ["macros", "meal planning", "protein", "balanced plate"],
    chapters: [
      {
        id: "chapter-macros",
        title: "Macronutrient Basics",
        position: 1,
        lessons: [
          {
            id: "lesson-protein",
            title: "Protein for satiety and recovery",
            description:
              "Explains how protein supports fullness, muscle repair, and more stable energy across the day.",
            keywords: ["protein", "satiety", "recovery", "energy"],
          },
          {
            id: "lesson-carbs",
            title: "Carbohydrates and energy timing",
            description:
              "Covers how carbohydrate quality and timing affect energy, workouts, and appetite.",
            keywords: ["carbohydrates", "energy", "meal timing", "workouts"],
          },
        ],
      },
      {
        id: "chapter-planning",
        title: "Meal Planning",
        position: 2,
        lessons: [
          {
            id: "lesson-balanced-plate",
            title: "Building a balanced plate",
            description:
              "Introduces a flexible plate method using protein, fiber-rich carbohydrates, healthy fats, and vegetables.",
            keywords: ["balanced plate", "fiber", "healthy fats", "vegetables"],
          },
          {
            id: "lesson-routine",
            title: "Creating a consistent eating routine",
            description:
              "Helps learners build realistic meal spacing and snack structure without rigid dieting rules.",
            keywords: ["routine", "meal spacing", "snacks", "consistency"],
          },
        ],
      },
    ],
  },
  {
    id: "course-gut-health",
    title: "Gut Health Essentials",
    slug: "gut-health-essentials",
    description:
      "Focuses on digestion, fiber diversity, probiotics, hydration, and building a gut-friendly routine.",
    smallDescription: "Digestive wellness, fiber, and gut-supportive habits.",
    category: "Special Topics",
    level: "INTERMEDIATE",
    duration: 6,
    status: "PUBLISHED",
    progress: {
      percentage: 33,
      completedLessons: 2,
      totalLessons: 6,
      isCompleted: false,
    },
    searchableTerms: ["gut health", "fiber", "probiotics", "hydration"],
    chapters: [
      {
        id: "chapter-fiber",
        title: "Fiber and Digestion",
        position: 1,
        lessons: [
          {
            id: "lesson-fiber-diversity",
            title: "Why fiber diversity matters",
            description:
              "Shows how a wider mix of plant foods can support digestion and microbiome variety.",
            keywords: ["fiber", "digestion", "microbiome", "plant foods"],
          },
          {
            id: "lesson-hydration-gut",
            title: "Hydration and bowel regularity",
            description:
              "Connects fluid intake, fiber, and bowel regularity in a simple habit framework.",
            keywords: ["hydration", "bowel regularity", "fluids", "habit framework"],
          },
        ],
      },
    ],
  },
  {
    id: "course-sports-fueling",
    title: "Sports Fueling Fundamentals",
    slug: "sports-fueling-fundamentals",
    description:
      "Introduces hydration, pre-workout meals, post-workout recovery, and fueling for performance.",
    smallDescription: "Hydration and workout nutrition basics.",
    category: "Performance",
    level: "INTERMEDIATE",
    duration: 5,
    status: "PUBLISHED",
    progress: {
      percentage: 20,
      completedLessons: 1,
      totalLessons: 5,
      isCompleted: false,
    },
    searchableTerms: ["hydration", "recovery", "workout meal", "electrolytes"],
    chapters: [
      {
        id: "chapter-workout-fuel",
        title: "Fueling Around Training",
        position: 1,
        lessons: [
          {
            id: "lesson-pre-workout",
            title: "Pre-workout meal basics",
            description:
              "Reviews meal timing and food composition before exercise to support comfort and energy.",
            keywords: ["pre-workout", "meal timing", "energy", "exercise"],
          },
          {
            id: "lesson-post-workout",
            title: "Post-workout recovery plate",
            description:
              "Covers protein, carbohydrate, and hydration priorities after training.",
            keywords: ["post-workout", "recovery", "protein", "hydration"],
          },
        ],
      },
    ],
  },
];