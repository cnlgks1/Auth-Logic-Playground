const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
    ]
  },
};

export default nextConfig;
