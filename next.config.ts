import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "abdullah-health-academy-dev.fly.storage.tigris.dev",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "abdullah-health-academy-dev.t3.tigrisfiles.io",
      },
    ],
  },
  serverExternalPackages: ["pdf-parse"],
} as NextConfig;

export default nextConfig;
