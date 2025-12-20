import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {exclude: ['error']} : false,
  },
  reactStrictMode: true, 
  typescript: {
     ignoreBuildErrors: true,
  },
    //  experimental: {
    //     optimizeCss: false,
    // },
    deploymentId: '191220252211',
};

export default nextConfig;
