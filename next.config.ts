import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {exclude: ['error']} : false,
  },
  reactStrictMode: true, 
  typescript: {
     ignoreBuildErrors: true,
  },
     experimental: {
        optimizeCss: true,
    },
   //  deploymentId: '261220251612',
};

export default nextConfig;
