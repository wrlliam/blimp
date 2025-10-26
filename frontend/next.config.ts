import { url } from "inspector";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        hostname: "cdn.discordapp.com",
      },
      {
        hostname: "gravatar.com",
      },
    ],
  },

  // experimental: {
  //   g
  // },
};

export default nextConfig;
