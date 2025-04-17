/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: "export",
  distDir: "out",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // 添加Netlify部署中禁用revalidation路径的配置
  exportPathMap: async function (defaultPathMap) {
    // 从默认路径映射中删除/revalidation路径
    delete defaultPathMap["/revalidation"];

    return {
      ...defaultPathMap,
      "/": { page: "/" },
    };
  },
};

module.exports = nextConfig;
