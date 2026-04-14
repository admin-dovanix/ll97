import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@airwise/database", "@airwise/domain", "@airwise/rules", "@airwise/ui"]
};

export default nextConfig;
