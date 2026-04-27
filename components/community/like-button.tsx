"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toggleLike } from "@/app/actions/community/toggle-like";

export function LikeButton({
  postId,
  hasLiked,
  count,
}: {
  postId: string;
  hasLiked: boolean;
  count: number;
}) {
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    startTransition(async () => {
      await toggleLike(postId);
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={isPending}
      className="flex items-center gap-2"
    >
      <Heart
        className={`size-4 ${
          hasLiked ? "fill-red-500 text-red-500" : ""
        }`}
      />
      {count}
    </Button>
  );
}