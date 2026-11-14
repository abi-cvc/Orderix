import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Se ejecuta con un servidor Node propio (server.ts), nunca serverless.
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
