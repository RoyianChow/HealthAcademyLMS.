"use client";

import * as React from "react";
import { useAiAdvisor } from "@/components/chat/ai-advisor";
import { cn } from "@/lib/utils";

export function QuizHeaderWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isOpen } = useAiAdvisor();

  return (
    <div
      data-sidebar-open={isOpen}
      className={cn("group/quiz-header", className)}
    >
      {children}
    </div>
  );
}
