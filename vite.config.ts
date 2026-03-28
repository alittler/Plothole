import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { execSync } from 'child_process';
import license from 'rollup-plugin-license';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  console.log('Loaded ENV keys:', Object.keys(env).filter(k => k.includes('GEMINI') || k.includes('CLERK')));
  return {
    plugins: [
      react(), 
      tailwindcss(),
      license({
        thirdParty: {
          output: [
            path.resolve(__dirname, './public/licenses.txt'),
            path.resolve(__dirname, './THIRD-PARTY-NOTICES.txt'),
          ],
          includePrivate: true,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(env.VITE_CLERK_PUBLISHABLE_KEY || env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISH || ''),
      'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(commitHash),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    watch: {
      ignored: ['**/public/source/**', '**/public/uploads/**', '**/source/**'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/source-files': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
