import { defineCopy } from "../../lib/i18n";

export const footerCopy = defineCopy({
  en: {
    sign: "Hold your data up to the light",
    tagline: "Open-source, read-only SQL data checks for PostgreSQL.",
    page: "On this page",
    product: "Product",
    demo: "Live demo",
    mcp: "MCP server",
    project: "Project",
    github: "GitHub",
    guide: "Setup guide",
    license: "Apache-2.0 license",
    note: (
      <>
        Every example on this page comes from the demo dataset in <code>scripts/demo</code> and its real runs up to Oct 19; composed runs are
        marked Example.
      </>
    ),
  },
  zh: {
    sign: "把数据放到灯下看清楚",
    tagline: "面向 PostgreSQL 的开源只读 SQL 数据检查。",
    page: "本页",
    product: "产品",
    demo: "在线演示",
    mcp: "MCP 服务",
    project: "项目",
    github: "GitHub",
    guide: "部署指南",
    license: "Apache-2.0 许可",
    note: (
      <>
        本页所有示例都来自 <code>scripts/demo</code> 里的演示数据和它在 10 月 19 日之前的真实运行；组合出来的运行都标注为“示例”。
      </>
    ),
  },
});
