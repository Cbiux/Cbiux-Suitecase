import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["react-globe.gl", "globe.gl", "three-globe", "three"],
};

export default nextConfig;
