/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
  },
  // 开发模式优化
  experimental: {
    // 禁用开发模式下的静态优化，减少CSS文件路径变更
    optimizePackageImports: ['lucide-react'],
  },
  // TypeScript 配置 - 排除归档目录
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json'
  },
  // CSS 配置优化
  compiler: {
    // 移除控制台警告
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },
  // 开发服务器配置
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // 页面在内存中保持的最长时间
      maxInactiveAge: 60 * 1000,
      // 同时保持的页面数
      pagesBufferLength: 5,
    },
  }),
  async redirects() {
    return [];
  },
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
