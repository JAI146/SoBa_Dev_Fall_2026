/* global process */
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: process.env.BACKEND_API_URL + "/:path*",
      },
    ];
  },
};

export default nextConfig;
