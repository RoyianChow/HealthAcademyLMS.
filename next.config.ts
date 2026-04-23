import type { NextConfig } from "next";
//@ts-ignore
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

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
    webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()]
    }

    return config
  },
};

export default nextConfig;