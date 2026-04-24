import { z } from "zod";

export const courseLevels = ["Beginner", "Intermediate", "Advanced"] as const;

export const courseStatus = ["Draft", "Published", "Archived"] as const;

export const courseCategories = [
  "Development",
  "Business",
  "Finance",
  "IT & Software",
  "Office Productivity",
  "Personal Development",
  "Design",
  "Marketing",
  "Health & Fitness",
  "Music",
  "Teaching & Academics",
] as const;

export const courseSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters long" })
    .max(100, { message: "Title must be at most 100 characters long" }),

  description: z
    .string()
    .min(3, { message: "Description must be at least 3 characters long" }),

  smallDescription: z
    .string()
    .min(3, { message: "Small Description must be at least 3 characters long" })
    .max(200, {
      message: "Small Description must be at most 200 characters long",
    }),

  slug: z
    .string()
    .min(3, { message: "Slug must be at least 3 characters long" }),

  category: z.enum(courseCategories, {
    message: "Category is required",
  }),

  price: z.coerce
    .number()
    .int({ message: "Price must be a whole number" })
    .min(1, { message: "Price must be a positive number" }),

  duration: z.coerce
    .number()
    .int({ message: "Duration must be a whole number" })
    .min(1, { message: "Duration must be at least 1 hour" })
    .max(500, { message: "Duration must be at most 500 hours" }),

  level: z.enum(courseLevels, {
    message: "Level is required",
  }),

  status: z.enum(courseStatus, {
    message: "Status is required",
  }),

  fileKey: z.string().min(1, { message: "File is required" }),

  thumbnailKey: z.string().nullable().optional(),

  stripePriceId: z.string().optional(),
});

export const chapterSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" }),

  courseId: z.string().uuid({ message: "Invalid course id" }),
});

export const lessonDocumentSchema = z.object({
  id: z.string().optional(),

  name: z
    .string()
    .min(1, { message: "Document name is required" }),

  fileKey: z
    .string()
    .min(1, { message: "Document file key is required" }),

  fileUrl: z.string().nullable().optional(),
  fileType: z.string().nullable().optional(),

  fileSize: z.coerce.number().int().nullable().optional(),
});

export const lessonSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" }),

  chapterId: z.string().uuid({ message: "Invalid chapter ID" }),
  courseId: z.string().uuid({ message: "Invalid course ID" }),

  description: z
    .string()
    .min(3, { message: "Description must be at least 3 characters long" })
    .optional()
    .or(z.literal("")),

  content: z.string().optional().or(z.literal("")),

  thumbnailKey: z.string().optional().or(z.literal("")),
  videoKey: z.string().optional().or(z.literal("")),

  youtubeUrl: z
    .string()
    .url("Please enter a valid URL")
    .refine(
      (url) =>
        url.includes("youtube.com/watch?v=") ||
        url.includes("youtu.be/") ||
        url.includes("youtube.com/embed/"),
      "Please enter a valid YouTube URL"
    )
    .optional()
    .or(z.literal("")),

  isPublished: z.boolean().default(false).optional(),
  isFreePreview: z.boolean().default(false).optional(),

  documents: z.array(lessonDocumentSchema).default([]).optional(),
});

export type CourseSchemaType = z.infer<typeof courseSchema>;
export type ChapterSchemaType = z.infer<typeof chapterSchema>;
export type LessonDocumentSchemaType = z.infer<typeof lessonDocumentSchema>;
export type LessonSchemaType = z.infer<typeof lessonSchema>;