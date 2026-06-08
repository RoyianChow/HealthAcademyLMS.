import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "health-academy-lms.fly.storage.tigris.dev",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "health-academy-lms.t3.tigrisfiles.io",
      },
    ],
  },
  serverExternalPackages: ["pdf-parse"],

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
} as NextConfig;

export default nextConfig;
