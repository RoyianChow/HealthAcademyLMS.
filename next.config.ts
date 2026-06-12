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
} as NextConfig;

export default nextConfig;
