"use client";

import dynamic from "next/dynamic";

export const RichTextEditor = dynamic(
  () =>
    import("@/components/rich-text-editor/Editor").then(
      (module) => module.RichTextEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[180px] animate-pulse rounded-md border bg-muted/40" />
    ),
  }
);
