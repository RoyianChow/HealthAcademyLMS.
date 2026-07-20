import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { S3 } from "@/lib/S3Client";

// Serves lesson documents with an explicit Content-Type so browsers render
// PDFs inline. Documents uploaded before the upload route set a content type
// are stored as application/octet-stream, which forces a download when the
// S3 URL is opened directly.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileKey = req.nextUrl.searchParams.get("key");
  const asDownload = req.nextUrl.searchParams.get("download") === "1";

  if (!fileKey) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const document = await prisma.lessonDocument.findFirst({
    where: { fileKey },
    select: {
      name: true,
      fileKey: true,
      fileType: true,
      lesson: {
        select: {
          isFreePreview: true,
          chapter: { select: { courseId: true } },
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!document.lesson.isFreePreview) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: document.lesson.chapter.courseId,
        },
      },
      select: { status: true },
    });

    if (enrollment?.status !== "Active") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    // Read using the database-verified key, not the raw query parameter, so
    // only keys registered as lesson documents can ever reach S3.
    const object = await S3.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: document.fileKey,
      })
    );

    if (!object.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const isPdf =
      document.fileType === "application/pdf" ||
      /\.pdf$/i.test(document.name) ||
      /\.pdf$/i.test(document.fileKey);

    const contentType = isPdf
      ? "application/pdf"
      : document.fileType || object.ContentType || "application/octet-stream";

    const safeName = document.name.replace(/[^\w.\- ]/g, "_") || "document";
    const disposition = asDownload ? "attachment" : "inline";

    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        ...(object.ContentLength
          ? { "Content-Length": String(object.ContentLength) }
          : {}),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to stream lesson document:", error);

    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 }
    );
  }
}
