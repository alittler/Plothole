import type { NextConfig } from 'next';
import { execSync } from 'child_process';

let gitCommitHash = 'unknown';
try {
  gitCommitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch (e) {
  // Git not available or not a git repo
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    NEXT_PUBLIC_GIT_COMMIT_HASH: gitCommitHash,
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
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
    }
  },
};

export default nextConfig;
