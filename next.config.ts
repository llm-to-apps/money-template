import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '*.localhost', '*.os7.dev'],
  distDir: process.env.NEXT_DIST_DIR ?? '.next'
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
