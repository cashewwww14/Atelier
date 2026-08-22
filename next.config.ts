import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // three ships untranspiled ESM examples; Next handles them fine but the
  // package is large enough that scoping optimization to it is worthwhile.
  transpilePackages: ["three"],
  experimental: {
    optimizePackageImports: ["@react-three/drei"],
  },
};

export default nextConfig;
