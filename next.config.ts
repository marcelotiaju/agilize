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
        optimizeCss: false,
        //cpus: 1,
        //webpackBuildWorker: true,
        //workerThreads: false,
    },/*
    transpilePackages: ['@acme/ui', 'lucide-react', 'react-number-format', 'react-hook-form', 'zod', 'axios', 'date-fns', 'react', 'react-dom', 'next',
      'mermaid', 'marked', '@tanstack/react-query', '@tanstack/query-core', '@tanstack/react-query-devtools', '@headlessui/react', '@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-checkbox', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', 'clsx', 'tailwind-merge', 'react-hot-toast'
    ],*/
    //  staticPageGenerationTimeout: 1000,
    //  bundlePagesRouterDependencies: true,
    //  outputFileTracingIncludes: {
    //    'src/app/api/contributors/upload/route.ts': ['fs', 'path'],
    //    'src/app/api/contributors/route.ts': ['fs', 'path'],
    //    '/public/uploads': ['fs', 'path'],
    // },
};

export default nextConfig;
