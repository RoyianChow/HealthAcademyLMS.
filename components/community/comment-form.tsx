"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createComment } from "@/app/actions/community/create-comment";
import { toast } from "sonner";

export function CommentForm({ postId }: { postId: string }) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    startTransition(async () => {
      const res = await createComment({ postId, content });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Comment added!");
        setContent("");
      }
    });
  };

  return (
    <div className="flex items-center gap-2 pt-2">
      <Input
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isPending}
      />

      <Button size="sm" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "Posting..." : "Post"}
      </Button>
    </div>
  );
}   