import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Corporate Wellness",
  description:
    "Interactive corporate wellness workshops on nutrition, stress management, energy, and immunity for healthier, more productive teams.",
  path: "/corporate-wellness",
});

export default function CorporateWellnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
