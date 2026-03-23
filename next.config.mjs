/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Disable static export for pages using dynamic data
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
