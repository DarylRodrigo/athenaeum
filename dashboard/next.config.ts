import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://rodbachler.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
