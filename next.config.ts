/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['face-api.js'],
  webpack: (config: any) => {
    // Add a fallback for node-specific modules
    config.resolve.fallback = {
      fs: false,
      path: false,
      util: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
