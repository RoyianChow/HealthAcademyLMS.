// components/chat/sidebar-state-wrapper.tsx
"use client";

import * as React from "react";
import { useAiAdvisor } from "@/components/chat/ai-advisor";
import { cn } from "@/lib/utils";

export function SidebarStateWrapper({
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
      className={cn("group/page-wrapper", className)}
    >
      {children}
    </div>
  );
}
