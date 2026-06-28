import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma(한글 경로 패치) + hyparquet(순수 ESM) 서버 전용 외부화
  serverExternalPackages: ["@prisma/client", "prisma", "hyparquet", "hyparquet-compressors"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
