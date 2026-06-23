import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "health-academy-lms.t3.tigrisfiles.io",
      },
      {
        protocol: "https",
        hostname: "health-academy-lms.fly.storage.tigris.dev",
      },
    ],
  },
};

export default nextConfig;