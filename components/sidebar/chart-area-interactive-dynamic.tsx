"use client";

import dynamic from "next/dynamic";

export const ChartAreaInteractive = dynamic(
  () =>
    import("@/components/sidebar/chart-area-interactive").then(
      (module) => module.ChartAreaInteractive
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] animate-pulse rounded-xl border bg-muted/40" />
    ),
  }
);
