"use client";

import type { LessonDocumentSchemaType } from "@/lib/zodSchemas";
import { Button } from "@/components/ui/button";
import { FileText, Trash, UploadCloud, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type LessonDocumentsUploaderProps = {
  value: LessonDocumentSchemaType[];
  onChange: (value: LessonDocumentSchemaType[]) => void;
};

export function LessonDocumentsUploader({
  value,
  onChange,
}: LessonDocumentsUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

    setIsUploading(true);

    try {
      const uploadedDocs: LessonDocumentSchemaType[] = [];

      for (const file of fileArray) {
        const res = await fetch("/api/s3/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
         body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          fileType: "document",
        }),
        });

        if (!res.ok) {
          throw new Error("Failed to create upload URL");
        }

        const uploadData = await res.json();

        const uploadUrl = uploadData.url;
        const fileKey = uploadData.fileKey;
        const fileUrl = uploadData.fileUrl ?? null;

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }

        uploadedDocs.push({
          id: crypto.randomUUID(),
          name: file.name,
          fileKey,
          fileUrl,
          fileType: file.type || null,
          fileSize: file.size,
        });
      }

      onChange([...value, ...uploadedDocs]);
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      setIsDragging(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleRemove(index: number) {
    const newDocs = [...value];
    newDocs.splice(index, 1);
    onChange(newDocs);
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
        onChange={(e) => {
          if (e.target.files) {
            uploadFiles(e.target.files);
          }
        }}
      />

      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);

          if (e.dataTransfer.files) {
            uploadFiles(e.dataTransfer.files);
          }
        }}
        className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:bg-muted/50"
        }`}
      >
        {isUploading ? (
          <Loader2 className="mb-3 size-8 animate-spin text-muted-foreground" />
        ) : (
          <UploadCloud className="mb-3 size-8 text-muted-foreground" />
        )}

        <p className="font-medium">
          {isUploading ? "Uploading..." : "Click to upload or drag files here"}
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          PDF, Word, PowerPoint, Excel, TXT, or CSV files
        </p>
      </button>

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((doc, index) => (
            <div
              key={doc.id ?? doc.fileKey ?? index}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-muted-foreground" />

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.fileSize
                      ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB`
                      : "Uploaded document"}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
              >
                <Trash className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}