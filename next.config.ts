
import type {NextConfig} from 'next';
import {exec} from 'child_process';
import {promisify} from 'util';
const execAsync = promisify(exec);

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
                compiler.hooks.afterEmit.tap('AfterEmitPlugin', async () => {
                    try {
                        await execAsync('cp public/firebase-messaging-sw.js public/firebase-messaging-sw.js.bak');
                        let sw = (await execAsync('cat public/firebase-messaging-sw.js')).stdout;
                        sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_API_KEY__/g, process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '');
                        sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__/g, process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '');
                        sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_PROJECT_ID__/g, process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '');
                        sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__/g, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '');
                        sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__/g, process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '');
                        sw = sw.replace(/__NEXT_PUBLIC_FIREBASE_APP_ID__/g, process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '');
                        await execAsync(`echo '${sw}' > public/firebase-messaging-sw.js`);
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
