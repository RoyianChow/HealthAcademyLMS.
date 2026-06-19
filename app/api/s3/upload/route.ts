import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3 } from "@/lib/S3Client";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { requireAdmin } from "@/app/data/admin/require-admin";
import type { AssetKind } from "@/lib/upload-scope";

const maxUploadBytes = 50 * 1024 * 1024;

const assetKindSchema = z.enum([
  "course-thumbnail",
  "course-image",
  "lesson-thumbnail",
  "lesson-video",
  "lesson-document",
  "lesson-image",
  "community-image",
  "draft-thumbnail",
]);

const fileUploadSchema = z.object({
  fileName: z.string().min(1, { message: "Filename is required" }),
  contentType: z.string().min(1, { message: "Content type is required" }),
  size: z
    .number()
    .min(1, { message: "Size is required" })
    .max(maxUploadBytes, { message: "File is too large" }),
  fileType: z.enum(["image", "video", "document"]).optional(),
  assetKind: assetKindSchema.optional(),
  courseId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
});

type FileUploadInput = z.infer<typeof fileUploadSchema>;

const aj = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 10,
  })
);

function buildS3Key(safeFileName: string, data: FileUploadInput): string {
  const id = uuidv4();
  const {
    assetKind: k,
    courseId: c,
    chapterId: ch,
    lessonId: l,
    fileType,
  } = data;

  if (k === "course-thumbnail" && c) {
    return `courses/${c}/thumbnail/${id}-${safeFileName}`;
  }
  if (k === "course-image" && c) {
    return `courses/${c}/description-images/${id}-${safeFileName}`;
  }
  if (k === "lesson-thumbnail" && c && ch && l) {
    return `courses/${c}/${ch}/lessons/${l}/thumbnail/${id}-${safeFileName}`;
  }
  if (k === "lesson-video" && c && ch && l) {
    return `courses/${c}/${ch}/lessons/${l}/videos/${id}-${safeFileName}`;
  }
  if (k === "lesson-document" && c && ch && l) {
    return `courses/${c}/${ch}/lessons/${l}/documents/${id}-${safeFileName}`;
  }
  if (k === "lesson-image" && c && ch && l) {
    return `courses/${c}/${ch}/lessons/${l}/content-images/${id}-${safeFileName}`;
  }
  if (k === "community-image" && c) {
    return `community/${c}/posts/${id}-${safeFileName}`;
  }
  if (k === "draft-thumbnail") {
    return `uploads/drafts/${id}-${safeFileName}`;
  }

  const folder =
    fileType === "document"
      ? "lesson-documents"
      : fileType === "video"
        ? "lesson-videos"
        : "images";

  return `${folder}/${id}-${safeFileName}`;
}

function requiresLessonScope(assetKind?: AssetKind): boolean {
  return (
    assetKind === "lesson-thumbnail" ||
    assetKind === "lesson-video" ||
    assetKind === "lesson-document" ||
    assetKind === "lesson-image"
  );
}

export async function POST(request: Request) {
  const session = await requireAdmin();

  try {
    const decision = await aj.protect(request, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const validation = fileUploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { fileName, contentType, size, courseId, chapterId, lessonId, assetKind } =
      validation.data;

    if (requiresLessonScope(assetKind)) {
      if (!courseId || !chapterId || !lessonId) {
        return NextResponse.json(
          { error: "courseId, chapterId, and lessonId are required for lesson uploads" },
          { status: 400 }
        );
      }

      const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, chapterId, chapter: { courseId } },
        select: { id: true },
      });

      if (!lesson) {
        return NextResponse.json({ error: "Invalid lesson scope" }, { status: 400 });
      }
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const uniqueKey = buildS3Key(safeFileName, validation.data);

    const command = new PutObjectCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      Key: uniqueKey,
      ContentType: contentType,
      ContentLength: size,
      ACL: "public-read",
    });

    const presignedUrl = await getSignedUrl(S3, command, {
      expiresIn: 360,
    });

    return NextResponse.json({
      url: presignedUrl,
      presignedUrl,
      fileKey: uniqueKey,
      key: uniqueKey,
      fileUrl: `${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${uniqueKey}`,
    });
  } catch (error) {
    console.error("S3_UPLOAD_URL_ERROR", error);

    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
