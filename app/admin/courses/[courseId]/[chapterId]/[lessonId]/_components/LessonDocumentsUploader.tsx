"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LessonDocument = {
  id: string;
  name: string;
  fileKey: string;
  fileUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};

type LessonDocumentsUploaderProps = {
  value: LessonDocument[];
  onChange: (documents: LessonDocument[]) => void;
};

const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function LessonDocumentsUploader({
  value,
  onChange,
}: LessonDocumentsUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadSingleFile(file: File): Promise<LessonDocument> {
    const res = await fetch("/api/lesson-documents/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to get upload URL");
    }

    const data = await res.json();

    const uploadRes = await fetch(data.url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload ${file.name}`);
    }

    return {
      id: crypto.randomUUID(),
      name: file.name,
      fileKey: data.fileKey,
      fileUrl: data.fileUrl ?? null,
      fileType: file.type,
      fileSize: file.size,
    };
  }

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);

    const invalidFiles = fileArray.filter(
      (file) => !ACCEPTED_DOCUMENT_TYPES.includes(file.type)
    );

    if (invalidFiles.length > 0) {
      alert("Some files are not supported. Please upload PDF, DOCX, CSV, PPTX, XLSX, or TXT files.");
      return;
    }

    try {
      setIsUploading(true);

      const uploadedDocuments: LessonDocument[] = [];

      for (const file of fileArray) {
        const uploaded = await uploadSingleFile(file);
        uploadedDocuments.push(uploaded);
      }

      onChange([...value, ...uploadedDocuments]);
    } catch (error) {
      console.error(error);
      alert("Failed to upload one or more files.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove(id: string) {
    onChange(value.filter((doc) => doc.id !== id));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            void handleFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          "rounded-2xl border border-dashed p-8 text-center transition",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20"
        )}
      >
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm">
            {isUploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Upload className="size-5" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-medium">Upload lesson documents</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click below to browse.
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF, DOC, DOCX, CSV, TXT, PPT, PPTX, XLS, XLSX
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            Choose Files
          </Button>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.csv,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
            onChange={(e) => {
              if (e.target.files?.length) {
                void handleFiles(e.target.files);
              }
            }}
          />
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="size-4" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.fileType || "Unknown type"}
                    {doc.fileSize ? ` • ${formatBytes(doc.fileSize)}` : ""}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(doc.id)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}