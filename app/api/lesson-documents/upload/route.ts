import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { requireAdmin } from "@/app/data/admin/require-admin";

const s3 = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

function sanitizeFileName(fileName: string) {
  return fileName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function POST(req: Request) {
  await requireAdmin();

  try {
    const body = await req.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 }
      );
    }

    const safeFileName = sanitizeFileName(fileName);
    const fileKey = `lesson-documents/${Date.now()}-${randomUUID()}-${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: env.NEXT_PUBLIC_S3_PUBLIC_URL,
      Key: fileKey,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    const endpoint = new URL(env.AWS_ENDPOINT_URL_S3);
    const fileUrl = `https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}.${endpoint.host}/${fileKey}`;

    return NextResponse.json({
      url,
      fileKey,
      fileUrl,
    });
  } catch (error) {
    console.error("Failed to generate upload URL:", error);

    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}