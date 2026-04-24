import { env } from "@/lib/env";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3 } from "@/lib/S3Client";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { requireAdmin } from "@/app/data/admin/require-admin";

const fileUploadSchema = z.object({
  fileName: z.string().min(1, { message: "Filename is required" }),
  contentType: z.string().min(1, { message: "Content type is required" }),
  size: z.number().min(1, { message: "Size is required" }),
  fileType: z.enum(["image", "video", "document"]).optional(),
});

const aj = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 10,
  })
);

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();

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

    const { fileName, contentType, size, fileType } = validation.data;

    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const folder =
      fileType === "document"
        ? "lesson-documents"
        : fileType === "video"
          ? "lesson-videos"
          : "images";

    const uniqueKey = `${folder}/${uuidv4()}-${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      Key: uniqueKey,
      ContentType: contentType,
      ContentLength: size,
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