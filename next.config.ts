import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  distDir: ".next",
  // 添加Netlify部署中禁用revalidation路径的配置
  exportPathMap: async function (
    defaultPathMap: Record<string, { page: string }>
  ) {
    // 从默认路径映射中删除/revalidation路径
    delete defaultPathMap["/revalidation"];

    return {
      ...defaultPathMap,
      "/": { page: "/" },
    };
  },
};

export default nextConfig;
