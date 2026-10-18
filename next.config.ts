import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /videos is disabled for now (page kept in src/app/(app)/videos); remove this to bring it back
      { source: '/videos', destination: '/dashboard', permanent: false },
      // The games section moved from /play to /mini-games
      { source: '/play', destination: '/mini-games', permanent: true },
      { source: '/play/:path*', destination: '/mini-games/:path*', permanent: true },
    ]
  },
};

export default nextConfig;
