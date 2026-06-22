import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "health-academy-lms.t3.tigrisfiles.io",
        port: "",
        pathname: "/**",
      },
    ],
  },

  serverExternalPackages: [
    "pdf-parse",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
};

export default nextConfig;