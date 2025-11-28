import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore ESLint errors during builds on Vercel.
  // You can still run `npm run lint` locally to fix issues.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
