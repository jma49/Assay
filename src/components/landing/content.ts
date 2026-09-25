import { BRAND } from "@/lib/brand";

export { BRAND };

export type Language = "en" | "zh";

export type DemoKind =
  | "validator"
  | "ai"
  | "versions"
  | "schedule"
  | "statuses"
  | "trends"
  | "approvals"
  | "roles"
  | "audit";

interface FeatureItem {
  demo: DemoKind;
  title: string;
  body: string;
}

interface FeatureSection {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  items: FeatureItem[];
}

interface LandingCopy {
  nav: { features: string; quickStart: string; faq: string; signIn: string; openApp: string };
  hero: { title: string; subtitle: string; primary: string; secondary: string; demoNote: string };
  why: { eyebrow: string; title: string; cards: { title: string; body: string }[] };
  sections: FeatureSection[];
  quickStart: { eyebrow: string; title: string; body: string; readme: string };
  faq: { title: string; items: { q: string; a: string }[] };
  cta: { title: string; body: string };
  themeLabel: string;
  footer: string;
}

export const GITHUB_URL = "https://github.com/jma49/Assay";

export const QUICK_START = `git clone ${GITHUB_URL}.git
cd Assay && npm install

# Clerk, MongoDB, PostgreSQL and Upstash keys
cp .env.example .env.local

npm run seed:demo   # optional demo dataset
npm run dev`;

const en: LandingCopy = {
  nav: {
    features: "Features",
    quickStart: "Self-host",
    faq: "FAQ",
    signIn: "Sign in",
    openApp: "Open dashboard",
  },
  hero: {
    title: "Catch bad data before it ships.",
    subtitle:
      "Write SQL checks once. Run them on a schedule, read-only, and see what needs attention.",
    primary: "Try the live demo",
    secondary: "View on GitHub",
    demoNote: "Sign in with any email. New accounts join the demo workspace as viewers.",
  },
  why: {
    eyebrow: `Why ${BRAND}`,
    title: "Data checks your team can trust",
    cards: [
      {
        title: "Read-only by design",
        body: "Every script is validated before it is saved, and runs inside a read-only transaction with a server-side timeout.",
      },
      {
        title: "Runs on a schedule",
        body: "Give a check a cron expression and it runs on its own. Results land in one history you can filter and search.",
      },
      {
        title: "Reviewed before it runs",
        body: "New and edited scripts go through approval. Roles decide who can write, approve or only read.",
      },
      {
        title: "AI in the loop",
        body: "Generate a check from a sentence, get a review of a query, or an explanation when a run fails.",
      },
    ],
  },
  sections: [
    {
      id: "write",
      eyebrow: "Write",
      title: "From question to check in minutes",
      lead: "A check is a query that should return nothing. If it returns rows, someone needs to look.",
      items: [
        {
          demo: "validator",
          title: "Read-only validator",
          body: "Writes, DDL and dangerous functions are rejected on save, rollback and execution.",
        },
        {
          demo: "ai",
          title: "AI-assisted SQL",
          body: "Describe the problem in plain language and get a query to start from.",
        },
        {
          demo: "versions",
          title: "Versions and rollback",
          body: "Every change is a version. Compare and roll back without leaving the editor.",
        },
      ],
    },
    {
      id: "monitor",
      eyebrow: "Monitor",
      title: "Know what needs attention",
      lead: "Every run is recorded with its status, findings and the rows it returned.",
      items: [
        {
          demo: "schedule",
          title: "Scheduled runs",
          body: "Cron schedules per script, plus one-click manual and bulk runs.",
        },
        {
          demo: "statuses",
          title: "Three clear statuses",
          body: "Passed, needs attention or failed — so a broken query never looks like clean data.",
        },
        {
          demo: "trends",
          title: "Trends over time",
          body: "See pass rates and recurring findings across scripts and weeks.",
        },
      ],
    },
    {
      id: "govern",
      eyebrow: "Govern",
      title: "Safe for the whole team",
      lead: "Built for teams where not everyone should touch production queries.",
      items: [
        {
          demo: "approvals",
          title: "Approval workflow",
          body: "Changes from developers wait for a manager or admin to approve.",
        },
        {
          demo: "roles",
          title: "Role-based access",
          body: "Admin, manager, developer and viewer, checked on every page and API route.",
        },
        {
          demo: "audit",
          title: "Edit history",
          body: "Who changed which script, when, and what the diff was.",
        },
      ],
    },
  ],
  quickStart: {
    eyebrow: "Open source",
    title: "Run it on your own stack",
    body: `${BRAND} is a Next.js app. Bring a Clerk app, MongoDB for scripts and history, the PostgreSQL database you want to check, and Upstash Redis for caching.`,
    readme: "Read the setup guide",
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        q: "Can a check modify my database?",
        a: "No. Scripts are validated as read-only when saved and again before running, and every run happens inside a read-only transaction.",
      },
      {
        q: "Which databases can I check?",
        a: "PostgreSQL today. The target is whatever DATABASE_URL points to, including managed services such as Neon or RDS.",
      },
      {
        q: "What counts as a failed check?",
        a: "A check that returns rows needs attention. A check that errors, for example because a column was renamed, is marked failed.",
      },
      {
        q: "Who can sign up?",
        a: "Anyone can create an account and gets the viewer role. An admin assigns higher roles.",
      },
    ],
  },
  cta: {
    title: "Know before your users do.",
    body: "Turn the queries you already run by hand into checks that run on their own.",
  },
  themeLabel: "Editor theme",
  footer: "Open source SQL checks for PostgreSQL.",
};

const zh: LandingCopy = {
  nav: {
    features: "功能",
    quickStart: "自托管",
    faq: "常见问题",
    signIn: "登录",
    openApp: "进入控制台",
  },
  hero: {
    title: "在坏数据上线之前发现它。",
    subtitle: "SQL 检查只写一次。定时运行、只读执行，需要关注的问题一目了然。",
    primary: "体验在线 Demo",
    secondary: "在 GitHub 查看",
    demoNote: "用任意邮箱登录即可，新账号会以查看者身份进入演示工作区。",
  },
  why: {
    eyebrow: `为什么选择 ${BRAND}`,
    title: "团队可以放心依赖的数据检查",
    cards: [
      {
        title: "天生只读",
        body: "脚本保存前会做只读校验，执行时运行在只读事务里，并带有服务端超时。",
      },
      {
        title: "定时运行",
        body: "给检查配置 cron 表达式即可自动运行，结果统一进入可筛选、可搜索的执行历史。",
      },
      {
        title: "先审批再运行",
        body: "新建和修改的脚本需要审批，角色决定谁能编写、审批或只读查看。",
      },
      {
        title: "AI 协助",
        body: "一句话生成检查脚本，让 AI 审阅查询，或在执行失败时给出原因分析。",
      },
    ],
  },
  sections: [
    {
      id: "write",
      eyebrow: "编写",
      title: "几分钟把问题变成检查",
      lead: "一个检查就是一条应该查不出结果的查询。查出了行，就说明有人需要看一下。",
      items: [
        {
          demo: "validator",
          title: "只读校验",
          body: "写操作、DDL 和危险函数会在保存、回滚和执行时被拦截。",
        },
        {
          demo: "ai",
          title: "AI 辅助写 SQL",
          body: "用自然语言描述问题，得到一条可以直接修改的查询。",
        },
        {
          demo: "versions",
          title: "版本与回滚",
          body: "每次修改都是一个版本，不离开编辑器就能对比和回滚。",
        },
      ],
    },
    {
      id: "monitor",
      eyebrow: "监控",
      title: "清楚知道哪里需要关注",
      lead: "每次执行都会记录状态、结论和返回的数据行。",
      items: [
        {
          demo: "schedule",
          title: "定时执行",
          body: "每个脚本单独配置 cron，也支持一键手动执行和批量执行。",
        },
        {
          demo: "statuses",
          title: "三种明确的状态",
          body: "通过、需要关注、失败——查询出错不会被误认为数据正常。",
        },
        {
          demo: "trends",
          title: "趋势分析",
          body: "按脚本、按周查看通过率和反复出现的问题。",
        },
      ],
    },
    {
      id: "govern",
      eyebrow: "治理",
      title: "整个团队都能安全使用",
      lead: "适合不是每个人都应该直接动生产查询的团队。",
      items: [
        {
          demo: "approvals",
          title: "审批流程",
          body: "开发者提交的修改需要经理或管理员审批后才生效。",
        },
        {
          demo: "roles",
          title: "基于角色的权限",
          body: "管理员、经理、开发者、查看者，每个页面和 API 都会校验。",
        },
        {
          demo: "audit",
          title: "编辑历史",
          body: "谁在什么时候改了哪个脚本，改了什么，一清二楚。",
        },
      ],
    },
  ],
  quickStart: {
    eyebrow: "开源",
    title: "部署在你自己的环境里",
    body: `${BRAND} 是一个 Next.js 应用。准备好 Clerk 应用、存放脚本和历史的 MongoDB、要检查的 PostgreSQL，以及用于缓存的 Upstash Redis 即可。`,
    readme: "查看部署文档",
  },
  faq: {
    title: "常见问题",
    items: [
      {
        q: "检查会修改我的数据库吗？",
        a: "不会。脚本在保存时和执行前都会做只读校验，每次执行都运行在只读事务里。",
      },
      {
        q: "可以检查哪些数据库？",
        a: "目前支持 PostgreSQL。检查对象就是 DATABASE_URL 指向的库，Neon、RDS 等托管服务都可以。",
      },
      {
        q: "什么情况算检查失败？",
        a: "查出数据行表示需要关注；执行报错（比如字段被改名）才会标记为失败。",
      },
      {
        q: "谁可以注册？",
        a: "任何人都可以注册，默认是查看者角色，更高的角色由管理员分配。",
      },
    ],
  },
  cta: {
    title: "在用户发现之前发现问题。",
    body: "把你平时手动跑的查询，变成会自动运行的检查。",
  },
  themeLabel: "编辑器主题",
  footer: "面向 PostgreSQL 的开源 SQL 检查工具。",
};

export const landingCopy: Record<Language, LandingCopy> = { en, zh };
