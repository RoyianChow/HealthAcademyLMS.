// components/rich-text-editor/TiptapImageUpload.tsx
"use client";

import { Editor } from "@tiptap/react";
import { ImageIcon, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TiptapImageUpload({ editor }: { editor: Editor }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Get S3 Presigned URL
      const res = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          fileType: "image",
        }),
      });

      if (!res.ok) throw new Error("Failed to create upload URL");

      const uploadData = await res.json();
      const uploadUrl = uploadData.url;
      const fileUrl = uploadData.fileUrl; 

      // 2. Upload file directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image to S3");

      // 3. Insert the image into the TipTap editor
      if (fileUrl) {
        editor.chain().focus().setImage({ src: fileUrl }).run();
      } else {
        throw new Error("No file URL returned from S3");
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload image"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        title="Upload Image"
      >
        {isUploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImageIcon className="size-4" />
        )}
      </Button>
    </>
  );
}
