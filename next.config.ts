import type { NextConfig } from 'next';

const gitCommitHash =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.NEXT_PUBLIC_GIT_COMMIT_HASH ||
  'unknown';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    NEXT_PUBLIC_GIT_COMMIT_HASH: gitCommitHash,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    NEXT_PUBLIC_GEMINI_API_KEY:
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          destination: '/creatures/:path*',
          has: [{ type: 'host', value: 'creatures\\.plothole\\.click' }],
        },
      ],
    };
  },
};

export default nextConfig;
