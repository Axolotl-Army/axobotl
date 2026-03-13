import type { NextConfig } from 'next';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (two levels up from src/dashboard/)
config({ path: resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
serverExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
