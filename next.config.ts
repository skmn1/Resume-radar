import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  turbopack: {
    root: '/home/kamnis/resumeRadar/resume-radar'
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
