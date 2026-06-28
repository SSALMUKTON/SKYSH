import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // parquet 리더(순수 ESM, node 전용)는 번들하지 말고 런타임 import 로 외부화.
  serverExternalPackages: ["hyparquet", "hyparquet-compressors"],
};

export default nextConfig;
