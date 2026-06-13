import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "About Us",
  description:
    "Meet the Natural Health Academy instructors and learn about our mission to make holistic health knowledge accessible and transformative.",
  path: "/about",
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
