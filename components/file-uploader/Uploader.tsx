"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { useConstructUrl } from "@/hooks/use-construct-url";
import { cn } from "@/lib/utils";

import {
  RenderEmptyState,
  RenderErrorState,
  RenderUploadedState,
  RenderUploadingState,
} from "./RenderState";

type AcceptedFileType = "image" | "video";

type UploaderState = {
  file: File | null;
  uploading: boolean;
  progress: number;
  key?: string;
  isDeleting: boolean;
  error: boolean;
  objectUrl?: string;
  fileType: AcceptedFileType;
};

type UploaderProps = {
  value?: string | null;
  onChange?: (value: string) => void;
  fileTypeAccepted: AcceptedFileType;
};

type PresignedUploadResponse = {
  presignedUrl: string;
  key: string;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 5_000 * 1024 * 1024;

function isLocalObjectUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("blob:");
}

function isPresignedUploadResponse(
  data: unknown
): data is PresignedUploadResponse {
  if (!data || typeof data !== "object") return false;

  const response = data as Partial<PresignedUploadResponse>;

  return (
    typeof response.presignedUrl === "string" &&
    response.presignedUrl.length > 0 &&
    typeof response.key === "string" &&
    response.key.length > 0
  );
}

export function Uploader({
  onChange,
  value,
  fileTypeAccepted,
}: UploaderProps) {
  const fileUrl = useConstructUrl(value ?? "");

  const initialState = useMemo<UploaderState>(
    () => ({
      file: null,
      uploading: false,
      progress: 0,
      key: value ?? undefined,
      isDeleting: false,
      error: false,
      objectUrl: value ? fileUrl : undefined,
      fileType: fileTypeAccepted,
    }),
    [fileTypeAccepted, fileUrl, value]
  );

  const [fileState, setFileState] = useState<UploaderState>(initialState);

  useEffect(() => {
    setFileState((prev) => {
      if (prev.key === value) return prev;

      if (isLocalObjectUrl(prev.objectUrl)) {
        URL.revokeObjectURL(prev.objectUrl);
      }

      return {
        file: null,
        uploading: false,
        progress: 0,
        key: value ?? undefined,
        isDeleting: false,
        error: false,
        objectUrl: value ? fileUrl : undefined,
        fileType: fileTypeAccepted,
      };
    });
  }, [fileTypeAccepted, fileUrl, value]);

  useEffect(() => {
    return () => {
      if (isLocalObjectUrl(fileState.objectUrl)) {
        URL.revokeObjectURL(fileState.objectUrl);
      }
    };
  }, [fileState.objectUrl]);

  const uploadFile = useCallback(
    async (file: File) => {
      setFileState((prev) => ({
        ...prev,
        uploading: true,
        progress: 0,
        error: false,
      }));

      try {
        const presignedResponse = await fetch("/api/s3/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            isImage: fileTypeAccepted === "image",
          }),
        });

        if (!presignedResponse.ok) {
          throw new Error("Failed to create upload URL");
        }

        const presignedData: unknown = await presignedResponse.json();

        if (!isPresignedUploadResponse(presignedData)) {
          throw new Error("Invalid upload response");
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;

            const progress = Math.round((event.loaded / event.total) * 100);

            setFileState((prev) => ({
              ...prev,
              progress,
            }));
          };

          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 204) {
              resolve();
              return;
            }

            reject(new Error("Upload failed"));
          };

          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.onabort = () => reject(new Error("Upload cancelled"));

          xhr.open("PUT", presignedData.presignedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setFileState((prev) => ({
          ...prev,
          uploading: false,
          progress: 100,
          key: presignedData.key,
          error: false,
        }));

        onChange?.(presignedData.key);
        toast.success("File uploaded successfully");
      } catch (error) {
        console.error("UPLOAD_ERROR", error);

        toast.error("Upload failed. Please try again.");

        setFileState((prev) => ({
          ...prev,
          uploading: false,
          progress: 0,
          error: true,
        }));
      }
    },
    [fileTypeAccepted, onChange]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];

      if (!file) return;

      setFileState((prev) => {
        if (isLocalObjectUrl(prev.objectUrl)) {
          URL.revokeObjectURL(prev.objectUrl);
        }

        return {
          file,
          uploading: false,
          progress: 0,
          objectUrl: URL.createObjectURL(file),
          error: false,
          isDeleting: false,
          fileType: fileTypeAccepted,
        };
      });

      void uploadFile(file);
    },
    [fileTypeAccepted, uploadFile]
  );

  const handleRemoveFile = useCallback(async () => {
    if (fileState.isDeleting || !fileState.objectUrl) return;

    try {
      setFileState((prev) => ({
        ...prev,
        isDeleting: true,
        error: false,
      }));

      if (fileState.key) {
        const response = await fetch("/api/s3/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: fileState.key,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete file");
        }
      }

      if (isLocalObjectUrl(fileState.objectUrl)) {
        URL.revokeObjectURL(fileState.objectUrl);
      }

      onChange?.("");

      setFileState({
        file: null,
        uploading: false,
        progress: 0,
        objectUrl: undefined,
        key: undefined,
        error: false,
        fileType: fileTypeAccepted,
        isDeleting: false,
      });

      toast.success("File removed successfully");
    } catch (error) {
      console.error("DELETE_FILE_ERROR", error);

      toast.error("Error removing file. Please try again.");

      setFileState((prev) => ({
        ...prev,
        isDeleting: false,
        error: true,
      }));
    }
  }, [
    fileState.isDeleting,
    fileState.key,
    fileState.objectUrl,
    fileTypeAccepted,
    onChange,
  ]);

  const handleRejectedFiles = useCallback((fileRejections: FileRejection[]) => {
    const rejection = fileRejections[0];

    if (!rejection) return;

    const errorCode = rejection.errors[0]?.code;

    if (errorCode === "too-many-files") {
      toast.error("Too many files selected. Please upload only one file.");
      return;
    }

    if (errorCode === "file-too-large") {
      toast.error("File size exceeds the upload limit.");
      return;
    }

    if (errorCode === "file-invalid-type") {
      toast.error("Invalid file type selected.");
      return;
    }

    toast.error("File could not be uploaded.");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: handleRejectedFiles,
    accept:
      fileTypeAccepted === "video"
        ? {
            "video/*": [],
          }
        : {
            "image/*": [],
          },
    maxFiles: 1,
    multiple: false,
    maxSize: fileTypeAccepted === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE,
    disabled: fileState.uploading || Boolean(fileState.objectUrl),
  });

  function renderContent() {
    if (fileState.uploading && fileState.file) {
      return (
        <RenderUploadingState
          file={fileState.file}
          progress={fileState.progress}
        />
      );
    }

    if (fileState.error) {
      return <RenderErrorState />;
    }

    if (fileState.objectUrl) {
      return (
        <RenderUploadedState
          handleRemoveFile={handleRemoveFile}
          previewUrl={fileState.objectUrl}
          isDeleting={fileState.isDeleting}
          fileType={fileState.fileType}
        />
      );
    }

    return <RenderEmptyState isDragActive={isDragActive} />;
  }

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative h-64 w-full cursor-pointer border-2 border-dashed transition-colors duration-200 ease-in-out",
        isDragActive
          ? "border-primary border-solid bg-primary/10"
          : "border-border hover:border-primary",
        (fileState.uploading || fileState.objectUrl) &&
          "cursor-default hover:border-border"
      )}
    >
      <CardContent className="flex h-full w-full items-center justify-center p-4">
        <input {...getInputProps()} />
        {renderContent()}
      </CardContent>
    </Card>
  );
}