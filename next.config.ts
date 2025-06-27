import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'clips-presenters.d-id.com',
      },
    ],
  },
};

export default nextConfig;
