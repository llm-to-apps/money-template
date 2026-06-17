import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '*.localhost', '*.os7.dev'],
  distDir: process.env.NEXT_DIST_DIR ?? '.next'
};

export default nextConfig;
