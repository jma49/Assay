/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.2.1",
  },
  // 开发模式CSS优化
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // TypeScript 配置
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "./tsconfig.json",
  },
  // CSS 和编译器配置
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
  // 开发服务器配置优化
  ...(process.env.NODE_ENV === "development" && {
    onDemandEntries: {
      maxInactiveAge: 60 * 1000,
      pagesBufferLength: 5,
    },
  }),
  // Headers配置，防止CSS缓存问题
  async headers() {
    return [
      {
        source: "/_next/static/css/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              process.env.NODE_ENV === "development"
                ? "no-cache, no-store, must-revalidate"
                : "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    return [
      // 开发模式下的CSS 404处理
      ...(process.env.NODE_ENV === "development"
        ? [
            {
              source: "/_next/static/css/app/layout.css",
              destination: "/api/css-fallback",
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
