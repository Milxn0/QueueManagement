import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      "images.unsplash.com",
      "pexels.com",
      "cdn.pixabay.com",
      "lh3.googleusercontent.com",
      "xrxnwricckxzuhswoasc.supabase.co",
    ],
  },
};

export default nextConfig;
