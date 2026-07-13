/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@muakhah/i18n", "@muakhah/ui"],
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.BACKEND_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
