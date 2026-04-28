"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createPost } from "@/app/actions/community/create-post";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";

export function CreatePostForm({
  courseId,
  slug,
}: {
  courseId: string;
  slug: string;
}) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEmptyContent = (value: string) => {
    const plainText = value.replace(/<[^>]*>/g, "").trim();
    return plainText.length === 0;
  };

  const handleSubmit = () => {
    if (isEmptyContent(content)) {
      toast.error("Post cannot be empty");
      return;
    }

    startTransition(async () => {
      const res = await createPost({
        content,
        courseId,
        slug,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Post created!");
        setContent("");
      }
    });
  };

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-3 p-0">
        <RichTextEditor
          field={{
            value: content,
            onChange: setContent,
          }}
        />

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}