import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon' }];
  }
};

export default nextConfig;
