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
    //deploymentId: '201220250936',
};

export default nextConfig;
