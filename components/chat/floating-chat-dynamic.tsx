"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { FloatingChat } from "@/components/chat/floating-chat";

export const FloatingChatDynamic = dynamic<ComponentProps<typeof FloatingChat>>(
  () =>
    import("@/components/chat/floating-chat").then(
      (module) => module.FloatingChat
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Loading advisor...
      </div>
    ),
  }
);
