import type { Metadata } from "next";

const siteUrl =
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "https://healthacademy.ca";

export const siteConfig = {
  name: "Health Academy",
  description:
    "Advanced nutrition and holistic health courses from the Natural Health Academy by Happy Nutrition LTD. Learn evidence-based wellness strategies online.",
  url: siteUrl,
  keywords: [
    "health academy",
    "nutrition courses",
    "holistic health",
    "functional nutrition",
    "natural supplements",
    "wellness education",
  ],
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Health Academy logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = `${siteConfig.url}${path}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
    },
    alternates: {
      canonical: url,
    },
  };
}
