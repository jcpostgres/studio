
import type {NextConfig} from 'next';
import {exec} from 'child_process';
import {promisify} from 'util';
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config({ path: './.env' });

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // We need to inject the firebase config into the service worker
  // but we can't use environment variables directly in a service worker.
  // This build step replaces placeholders in the SW with actual env vars.
  webpack: (config, { isServer }) => {
    if (!isServer) {
    config.plugins.push({
      apply: (compiler: any) => {
        // Use tapPromise so we can await async fs operations in the hook
        compiler.hooks.afterEmit.tapPromise('AfterEmitPlugin', async () => {
          try {
            const swPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
            const bakPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js.bak');
            // create backup if possible
            try {
              await fs.copyFile(swPath, bakPath);
            } catch (e) {
              // ignore if backup can't be created (file may not exist yet)
            }

            let sw = '';
            try {
              sw = await fs.readFile(swPath, 'utf8');
            } catch (e) {
              // if file doesn't exist or can't be read, keep sw empty
              sw = '';
            }

            sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_API_KEY__/g, process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '');
            sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__/g, process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '');
            sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_PROJECT_ID__/g, process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '');
            sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__/g, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '');
            sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__/g, process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '');
            sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_APP_ID__/g, process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '');

            await fs.writeFile(swPath, sw, 'utf8');
          } catch (e) {
            console.error('Service worker environment variable replacement failed', e);
          }
        });
      }
    });
    }
    return config;
  }
};

export default nextConfig;
