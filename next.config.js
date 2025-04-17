/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // output: "export", // Removed for server-side/edge rendering
  // distDir: "out", // Use default .next directory
  images: {
    unoptimized: true, // Keep if needed, or configure properly for Next.js runtime
  },
  // trailingSlash: true, // Typically not needed with Next.js runtime
  // exportPathMap: async function (defaultPathMap) { // Not used without output: export
  //   // 从默认路径映射中删除/revalidation路径
  //   delete defaultPathMap["/revalidation"];
  //
  //   return {
  //     ...defaultPathMap,
  //     "/": { page: "/" },
  //   };
  // },
};

module.exports = nextConfig;
