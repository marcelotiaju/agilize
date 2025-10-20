import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
     ignoreBuildErrors: true,
  },
       experimental: {
        cpus: 1
    },
    transpilePackages: ['@acme/ui', 'lucide-react', 'react-number-format', 'react-hook-form', 'zod', 'axios', 'date-fns', 'react', 'react-dom', 'next',
      'mermaid', 'marked', '@tanstack/react-query', '@tanstack/query-core', '@tanstack/react-query-devtools', '@headlessui/react', '@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-checkbox', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', 'clsx', 'tailwind-merge', 'react-hot-toast'
    ],
     staticPageGenerationTimeout: 1000,
     bundlePagesRouterDependencies: true,
};

export default nextConfig;
