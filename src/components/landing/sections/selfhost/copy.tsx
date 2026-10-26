import { defineCopy } from "../../lib/i18n";

/**
 * Sources: LICENSE, package.json (engines and dependencies), .env.example, src/lib/config/env.ts, docs/deployment.md
 * and the README. The quick start is the README's. Nothing composed.
 */
export const selfhostCopy = defineCopy({
  en: {
    title: (
      <>
        Open source.
        <br />
        Runs on your <span className="nw">own stack.</span>
      </>
    ),
    lede: (
      <>
        Apache-2.0. The plate on the back of the box lists everything assay needs. Fill in <code>.env.local</code>, and five lines get it running on your
        machine, with the sample shop loaded if you want it.
      </>
    ),
    plateCap: ["The rating plate of assay ", ""],
    k: {
      license: "License",
      version: "Version",
      app: "App",
      store: "Store",
      reads: "Reads",
      signin: "Sign-in",
      schedule: "Schedules",
      trigger: "Trigger",
      cache: "Cache",
    },
    v: {
      store: "MongoDB, for checks, runs and users",
      reads: "PostgreSQL, read-only",
      signin: "Google or GitHub OAuth",
      schedule: "A cron expression per check, in UTC",
      trigger: "QStash, any cron or GitHub Actions, every 30 minutes",
      cache: "Upstash Redis, optional",
    },
    qs: "Quick start",
    c1: "# MongoDB, PostgreSQL, Better Auth, Google or GitHub",
    c2: "# optional: the sample shop and its checks",
    copy: "Copy",
    copied: "Copied",
    stamp: "Copied",
    copiedLong: "Copied the quick start",
    copyFail: "Copy failed: select the text instead",
    after: (
      <>
        Then sign in once and make yourself admin: <code>npm run user:set-role -- you@example.com admin</code>
      </>
    ),
    guide: "Read the self-hosting guide",
    github: "View on GitHub",
  },
  zh: {
    title: (
      <>
        开源，
        <br />
        部署在你<span className="nw">自己的环境里。</span>
      </>
    ),
    lede: (
      <>
        Apache-2.0 协议。灯箱背面的铭牌写着 assay 需要的一切。填好 <code>.env.local</code>，五行命令就能在你的电脑上跑起来；需要的话，再装上示例商店。
      </>
    ),
    plateCap: ["assay ", " 的铭牌"],
    k: {
      license: "许可证",
      version: "版本",
      app: "应用",
      store: "存储",
      reads: "读取",
      signin: "登录",
      schedule: "定时",
      trigger: "触发",
      cache: "缓存",
    },
    v: {
      store: "MongoDB，存放检查、运行记录和用户",
      reads: "PostgreSQL，只读",
      signin: "Google 或 GitHub OAuth",
      schedule: "每个检查一条 cron 表达式，UTC 时间",
      trigger: "QStash、任意 cron 或 GitHub Actions，每 30 分钟",
      cache: "Upstash Redis，可选",
    },
    qs: "快速开始",
    c1: "# 填写 MongoDB、PostgreSQL、Better Auth、Google 或 GitHub",
    c2: "# 可选：示例商店和它的检查",
    copy: "复制",
    copied: "已复制",
    stamp: "已复制",
    copiedLong: "已复制快速开始命令",
    copyFail: "复制失败，请手动选中文本",
    after: (
      <>
        然后登录一次，把自己设为管理员：<code>npm run user:set-role -- you@example.com admin</code>
      </>
    ),
    guide: "阅读自托管文档",
    github: "在 GitHub 上查看",
  },
});
