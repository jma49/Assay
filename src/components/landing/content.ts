import { BRAND, GITHUB_URL } from "@/lib/brand";

export { BRAND, GITHUB_URL };

export type Language = "en" | "zh";

export const QUICK_START = `git clone ${GITHUB_URL}.git
cd Assay && npm install

# Google/GitHub OAuth, MongoDB, PostgreSQL and Upstash keys
cp .env.example .env.local

npm run seed:demo   # optional demo dataset
npm run dev`;

/** A piece of the manifesto: plain words, or one of the inline marks set inside the sentence. */
export type ManifestoPart = string | { mark: "strip" | "rows" | "broken"; label?: string };

interface Titled {
  title: string;
  body: string;
}

export interface LandingCopy {
  nav: { product: string; run: string; demo: string; selfHost: string; docs: string; signIn: string; openApp: string; openDemo: string; language: string };
  /** The mono label above each section's title. */
  labels: { integrations: string; idea: string; product: string; run: string; scenarios: string; workflow: string; selfHost: string; faq: string };
  hero: {
    eyebrow: string;
    stats: { value: string; label: string }[];
    titleTop: string;
    titleBottom: string;
    subtitle: string;
    primary: string;
    secondary: string;
    demoNote: string;
    guestNote: string;
    window: {
      label: string;
      runAll: string;
      queued: string;
      columns: { check: string; status: string; runs: string; schedule: string };
      triageLabel: string;
      triageKind: string;
      triageBody: string;
      triagePrivacy: string;
    };
  };
  outcome: { clean: string; error: string; rows: (n: number) => string };
  marquee: string;
  manifesto: ManifestoPart[];
  bento: {
    title: string;
    lead: string;
    /** One mono label per feature cell: validator, states, coverage, triage, agents. */
    cellLabels: string[];
    validator: Titled & { ok: string; blocked: string; footnote: string; checkpoints: Titled[] };
    states: { title: string; rows: { clean: [string, string]; issues: [string, string]; broken: [string, string] } };
    coverage: Titled;
    triage: Titled & { kind: string };
    mcp: Titled & { prompt: string; answer: string };
  };
  run: {
    title: string;
    lead: string;
    steps: Titled[];
    previous: string;
    next: string;
    validate: { ok: string; blocked: string };
    executeCheck: string;
    moreRows: string;
    running: string;
    timeout: string;
    returned: string;
    liveValues: string;
    diff: { added: string; still: string; fixed: string; note: string };
    alert: { channel: string; title: string; lines: string; open: string; acknowledge: string; mute: string; acknowledged: string };
  };
  scenarios: { title: string; lead: string; cta: string; items: Titled[] };
  workflow: {
    title: string;
    stepLabel: (i: number, n: number) => string;
    steps: Titled[];
    prompt: { label: string; text: string; draft: string };
    approval: { request: [string, string, string]; pending: string; note: string; approve: string; reject: string };
    triage: { label: string; kind: string; summary: string; next: string; steps: string[] };
  };
  selfHost: { title: string; body: string; points: string[]; guide: string };
  faq: { title: string; items: { q: string; a: string }[] };
  cta: { titleTop: string; titleBottom: string; primary: string; secondary: string };
  footer: { tagline: string; product: string; demo: string; docs: string; mcp: string; project: string; guide: string; license: string; language: string };
}

const en: LandingCopy = {
  labels: { integrations: "Works with", idea: "The idea", product: "Safety and signal", run: "Anatomy of a run", scenarios: "In the demo", workflow: "Workflow", selfHost: "Self-host", faq: "FAQ" },
  nav: { product: "Product", run: "How a run works", demo: "Demo", selfHost: "Self-host", docs: "Docs", signIn: "Sign in", openApp: "Open dashboard", openDemo: "Open demo", language: "中文" },
  hero: {
    eyebrow: "Open source · PostgreSQL · Read-only",
    stats: [
      { value: "3×", label: "read-only checks before a query touches data" },
      { value: "30 s", label: "server-side statement timeout" },
      { value: "5", label: "chat channels for alerts, plus webhooks" },
      { value: "MCP", label: "for Claude Code, Cursor and other agents" },
    ],
    titleTop: "Catch bad data",
    titleBottom: "before it ships.",
    subtitle: "Read-only SQL checks for PostgreSQL. Scheduled, reviewed and triaged by AI, so a broken query never passes for clean data.",
    primary: "Open the live demo",
    secondary: "Star on GitHub",
    demoNote: "Sign in with any email. New accounts join the demo workspace as viewers.",
    guestNote: "No sign-up. Opens a sample shop database with problems planted in it.",
    window: {
      label: "Demo workspace",
      runAll: "Run all",
      queued: "Queued",
      columns: { check: "Check", status: "Status", runs: "Last 20 runs", schedule: "Schedule" },
      triageLabel: "AI triage",
      triageKind: "Problem in the check",
      triageBody: "The query itself is wrong, not the data: demo.orders has no shipping_status column. Check which column holds the shipping state, then update the query.",
      triagePrivacy: "AI sees the schema and a column profile, never the row values.",
    },
  },
  outcome: { clean: "Clean", error: "Query error", rows: (n) => (n === 1 ? "1 row" : `${n} rows`) },
  marquee: "Checks any PostgreSQL. Alerts land where your team already works.",
  manifesto: [
    "A check is a query that should return nothing.",
    { mark: "strip" },
    "When it returns",
    { mark: "rows", label: "6 rows" },
    "someone should look. When the query itself breaks,",
    { mark: "broken", label: "broken" },
    "it should never look like clean data.",
  ],
  bento: {
    title: "Safe enough for production. Simple enough for everyone.",
    lead: "Engineers write the SQL, managers approve it, analysts read the results. Nobody can write to your database.",
    cellLabels: ["Validator", "Run states", "Coverage", "AI triage", "Agents"],
    validator: {
      title: "Read-only, enforced three times",
      body: "Validated on save, again on rollback, and run inside a read-only transaction with a server-side timeout.",
      ok: "Read-only, ready to save",
      blocked: '"DELETE" is not allowed. Checks can only read data.',
      footnote: "read-only transaction · 30 s timeout",
      checkpoints: [
        { title: "On save", body: "Rejected before it exists" },
        { title: "On rollback", body: "Old versions re-checked" },
        { title: "Before it runs", body: "Checked again, read-only" },
      ],
    },
    states: {
      title: "Three states. No guessing.",
      rows: { clean: ["Clean", "no rows"], issues: ["Issues", "new · still open · fixed"], broken: ["Broken", "the query failed"] },
    },
    coverage: { title: "See what nobody watches", body: "Coverage maps checks to the tables they read, and shows the ones none of them do." },
    triage: { title: "AI triage when a run fails", body: "Likely causes, next steps and, when the query itself is wrong, a corrected version to start from.", kind: "the query is wrong, not the data" },
    mcp: { title: "Your agent can run checks too", body: "An MCP server for Claude Code, Cursor and others, with OAuth or a personal API key.", prompt: "which checks are broken?", answer: "1 broken: Shipping status check (broken)" },
  },
  run: {
    title: "What happens in one run.",
    lead: "Four steps, every time a check runs, whether on a schedule, by hand or from an agent.",
    steps: [
      { title: "Validated before it runs", body: "The validator reads the query before it is saved, and again before it runs." },
      { title: "Executed read-only", body: "A read-only transaction, against the database the check picks, with a server-side timeout." },
      { title: "Compared with the last run", body: "Rows are matched with the previous run, so you see what changed, not just a count." },
      { title: "The right people are told", body: "The alert carries its own buttons. Acknowledge from Slack or Telegram and the message updates for everyone." },
    ],
    previous: "Previous step",
    next: "Next step",
    validate: { ok: "Read-only, ready to save", blocked: '"UPDATE" is not allowed. Checks can only read data.' },
    executeCheck: "Duplicate orders",
    moreRows: "+ 2 more rows",
    running: "Running",
    timeout: "Timeout 30 s",
    returned: "6 rows",
    liveValues: "Nothing was written. Values from the live demo.",
    diff: { added: "new", still: "still open", fixed: "fixed", note: "Stale pending orders, Sep 29, in the live demo." },
    alert: {
      channel: "# data-alerts",
      title: "Stale pending orders: 8 rows new",
      lines: "Now returns 8 rows · 8 new, 0 still open, 7 fixed",
      open: "Open check",
      acknowledge: "Acknowledge",
      mute: "Mute 24 h",
      acknowledged: "Acknowledged by Sam",
    },
  },
  scenarios: {
    title: "Four problems are hiding in the demo.",
    lead: "Each one is a real check against the sample shop database. Open the demo and run them yourself.",
    cta: "Try it in the demo",
    items: [
      { title: "Duplicate orders", body: "Same customer, same total, within five minutes." },
      { title: "Negative inventory", body: "Products whose on-hand stock is below zero." },
      { title: "Paid, never charged", body: "Orders marked paid or shipped with no payment record." },
      { title: "A check that broke", body: "It references a column that does not exist. Assay marks it broken, not clean, and AI triage explains why." },
    ],
  },
  workflow: {
    title: "From a question to a check your team trusts.",
    stepLabel: (i, n) => `Step ${i} of ${n}`,
    steps: [
      { title: "Write it in SQL, or in a sentence", body: "Describe the problem and AI drafts a query. The validator rejects anything that could write before you can save it." },
      { title: "Reviewed before it runs", body: "Changes from developers wait for a manager or admin. Every version is kept, compared and one click from rollback." },
      { title: "Runs on its own schedule", body: "A cron expression per check, plus manual and bulk runs. Each run keeps its status, findings and the rows it returned." },
      { title: "Triaged when it goes wrong", body: "On a failed or flagged run, AI reads the query, the schema and a column profile, then says whether the data or the check is at fault." },
    ],
    prompt: { label: "Prompt", text: "orders marked paid but with no payment row", draft: "Draft" },
    approval: { request: ["sam", "wants to update", "Duplicate orders"], pending: "Pending", note: "Update · the diff is kept in edit history", approve: "Approve", reject: "Reject" },
    triage: { label: "AI triage", kind: "Data issue", summary: "Each row pairs an order with a second one from the same customer and total within five minutes.", next: "Next steps", steps: ["Confirm which order is real", "Cancel or refund the duplicate"] },
  },
  selfHost: {
    title: "Open source. Runs on your stack.",
    body: `Apache-2.0. ${BRAND} is a Next.js app: bring a Google or GitHub OAuth app, MongoDB for checks and history, the PostgreSQL you want to check and Upstash Redis.`,
    points: [
      "Connection strings encrypted at rest; private hosts refused unless you allow them.",
      "Admin, manager, developer and viewer roles, checked on every page and API route.",
      "Schedules from GitHub Actions or cron on your own server.",
    ],
    guide: "Read the setup guide",
  },
  faq: {
    title: "Questions",
    items: [
      { q: "Can a check modify my database?", a: "No. Scripts are validated as read-only when saved and again before running, and every run happens inside a read-only transaction." },
      { q: "Which databases can I check?", a: "PostgreSQL today, including managed services such as Neon or RDS. DATABASE_URL is the built-in source, and admins can add more databases in Settings; each check picks the one it runs against." },
      { q: "What counts as a failed check?", a: "A check that returns rows needs attention. A check that errors, for example because a column was renamed, is marked failed." },
      { q: "Who can sign up?", a: "Anyone can create an account and gets the viewer role. An admin assigns higher roles." },
    ],
  },
  cta: { titleTop: "Find the rows that", titleBottom: "shouldn't exist.", primary: "Open the live demo", secondary: "Self-host it" },
  footer: { tagline: "Open-source SQL data checks for PostgreSQL.", product: "Product", demo: "Live demo", docs: "Docs", mcp: "MCP server", project: "Project", guide: "Setup guide", license: "Apache-2.0", language: "Language" },
};

const zh: LandingCopy = {
  labels: { integrations: "适配", idea: "理念", product: "安全与信号", run: "一次运行", scenarios: "演示", workflow: "工作流", selfHost: "自托管", faq: "常见问题" },
  nav: { product: "产品", run: "一次运行", demo: "演示", selfHost: "自托管", docs: "文档", signIn: "登录", openApp: "进入控制台", openDemo: "打开演示", language: "EN" },
  hero: {
    eyebrow: "开源 · PostgreSQL · 只读",
    stats: [
      { value: "3 道", label: "只读校验，查询碰到数据之前" },
      { value: "30 秒", label: "服务端语句超时" },
      { value: "5 种", label: "聊天告警渠道，另有 Webhook" },
      { value: "MCP", label: "Claude Code、Cursor 等 AI 助手可直接调用" },
    ],
    titleTop: "在坏数据",
    titleBottom: "上线之前发现它。",
    subtitle: "面向 PostgreSQL 的只读 SQL 检查。定时运行、审批后生效、出错时由 AI 分析，查询出错永远不会被当成数据正常。",
    primary: "体验在线演示",
    secondary: "在 GitHub 上点星",
    demoNote: "用任意邮箱登录即可，新账号会以查看者身份进入演示工作区。",
    guestNote: "无需注册。打开一个埋好问题的示例商店数据库。",
    window: {
      label: "演示工作区",
      runAll: "全部运行",
      queued: "排队中",
      columns: { check: "检查", status: "状态", runs: "最近 20 次", schedule: "调度" },
      triageLabel: "AI 分析",
      triageKind: "检查本身有误",
      triageBody: "出错的是查询，不是数据：demo.orders 里没有 shipping_status 这一列。先确认哪一列记录物流状态，再修改查询。",
      triagePrivacy: "AI 只看表结构和列的统计概况，看不到具体数据。",
    },
  },
  outcome: { clean: "正常", error: "查询出错", rows: (n) => `${n} 行` },
  marquee: "可以检查任何 PostgreSQL，告警发到团队已经在用的地方。",
  manifesto: [
    "一个检查，就是一条本该查不出任何结果的查询。",
    { mark: "strip" },
    "一旦查出",
    { mark: "rows", label: "6 行" },
    "就该有人去看。查询本身出错时，",
    { mark: "broken", label: "出错" },
    "它绝不能看起来像数据正常。",
  ],
  bento: {
    title: "放心用在生产库，整个团队都会用。",
    lead: "工程师写 SQL，经理审批，分析师看结果。没有人能写入你的数据库。",
    cellLabels: ["校验器", "运行状态", "覆盖率", "AI 分析", "AI 助手"],
    validator: {
      title: "只读，三道关卡",
      body: "保存时校验一次，回滚时再校验一次，执行时运行在带服务端超时的只读事务里。",
      ok: "只读，可以保存",
      blocked: '禁止使用关键词 "DELETE"。系统仅允许查询操作（SELECT）。',
      footnote: "只读事务 · 30 秒超时",
      checkpoints: [
        { title: "保存时", body: "写操作根本存不进去" },
        { title: "回滚时", body: "旧版本也会重新校验" },
        { title: "执行前", body: "只读事务里再查一次" },
      ],
    },
    states: {
      title: "三种状态，一目了然。",
      rows: { clean: ["正常", "没有结果"], issues: ["有问题", "新增 · 仍未解决 · 已修复"], broken: ["出错", "查询本身失败"] },
    },
    coverage: { title: "看见没人盯着的表", body: "覆盖率把检查和它读取的表对应起来，也会标出还没有任何检查的表。" },
    triage: { title: "运行失败时，AI 帮你分析", body: "给出可能原因和下一步；如果是查询本身写错了，还会给一个修正后的版本作为起点。", kind: "出错的是查询，不是数据" },
    mcp: { title: "你的 AI 助手也能运行检查", body: "提供 MCP 服务，Claude Code、Cursor 等都能接入，支持 OAuth 或个人 API Key。", prompt: "哪些检查出错了？", answer: "1 个出错：物流状态检查（故意出错）" },
  },
  run: {
    title: "一次运行里发生了什么。",
    lead: "每次检查运行都会经过这四步，无论是定时、手动还是由 AI 助手触发。",
    steps: [
      { title: "运行前先校验", body: "校验器在保存前读一遍查询，运行前再读一遍。" },
      { title: "只读执行", body: "在检查选择的数据库上，以只读事务执行，并带有服务端超时。" },
      { title: "和上一次运行比对", body: "逐行和上一次运行比对，你看到的是变化，而不只是一个数字。" },
      { title: "通知到对的人", body: "告警消息自带按钮。在 Slack 或 Telegram 里点确认处理，所有人看到的消息都会同步更新。" },
    ],
    previous: "上一步",
    next: "下一步",
    validate: { ok: "只读，可以保存", blocked: '禁止使用关键词 "UPDATE"。系统仅允许查询操作（SELECT）。' },
    executeCheck: "重复下单",
    moreRows: "还有 2 行",
    running: "运行中",
    timeout: "超时 30 秒",
    returned: "6 行",
    liveValues: "没有写入任何数据。数据来自在线演示。",
    diff: { added: "新增", still: "仍未解决", fixed: "已修复", note: "长时间未处理的待支付订单，9 月 29 日，来自在线演示。" },
    alert: {
      channel: "# data-alerts",
      title: "长时间未处理的待支付订单 新增 8 行问题数据",
      lines: "当前返回 8 行 · 新增 8 行，仍存在 0 行，已修复 7 行",
      open: "查看检查",
      acknowledge: "确认处理",
      mute: "静音 24 小时",
      acknowledged: "Sam 已确认处理",
    },
  },
  scenarios: {
    title: "演示里藏着四个问题。",
    lead: "每一个都是针对示例商店数据库的真实检查。打开演示，亲手运行一次。",
    cta: "在演示里试试",
    items: [
      { title: "重复下单", body: "同一客户、同一金额，5 分钟内下了两单。" },
      { title: "库存为负", body: "现有库存小于 0 的商品。" },
      { title: "已支付却没扣款", body: "状态为已支付或已发货，但没有任何支付记录的订单。" },
      { title: "一个坏掉的检查", body: "它引用了一个不存在的字段。Assay 会把它标为出错而不是正常，并由 AI 解释原因。" },
    ],
  },
  workflow: {
    title: "从一个问题，到团队信得过的检查。",
    stepLabel: (i, n) => `第 ${i} 步，共 ${n} 步`,
    steps: [
      { title: "用 SQL 写，或者用一句话描述", body: "描述问题，AI 帮你起草查询。任何可能写入的语句在保存前就会被校验器拦下。" },
      { title: "审批之后才生效", body: "开发者提交的修改需要经理或管理员审批。每个版本都会保留，可以对比，一键回滚。" },
      { title: "按自己的节奏定时运行", body: "每个检查单独配置 cron，也支持手动和批量运行。每次运行都会保存状态、结论和返回的数据行。" },
      { title: "出错时有人帮你分析", body: "运行失败或查出问题时，AI 会读查询、表结构和列的统计概况，判断是数据有问题还是检查本身有误。" },
    ],
    prompt: { label: "描述", text: "状态是已支付，但没有支付记录的订单", draft: "草稿" },
    approval: { request: ["sam", "提交了修改：", "重复下单"], pending: "待审批", note: "修改 · 差异保存在编辑历史中", approve: "批准", reject: "拒绝" },
    triage: { label: "AI 分析", kind: "数据问题", summary: "每一行都是同一客户、同一金额、5 分钟内的两笔订单。", next: "下一步", steps: ["确认哪一笔订单是真实的", "取消或退款重复的那一笔"] },
  },
  selfHost: {
    title: "开源，部署在你自己的环境里。",
    body: `Apache-2.0 协议。${BRAND} 是一个 Next.js 应用：准备好 Google 或 GitHub OAuth 应用、存放检查和历史的 MongoDB、要检查的 PostgreSQL，以及 Upstash Redis 即可。`,
    points: [
      "连接串加密存储；除非你允许，否则拒绝连接内网地址。",
      "管理员、经理、开发者、查看者四种角色，每个页面和 API 都会校验。",
      "通过 GitHub Actions 或你自己服务器上的 cron 定时运行。",
    ],
    guide: "查看部署文档",
  },
  faq: {
    title: "常见问题",
    items: [
      { q: "检查会修改我的数据库吗？", a: "不会。脚本在保存时和执行前都会做只读校验，每次执行都运行在只读事务里。" },
      { q: "可以检查哪些数据库？", a: "目前支持 PostgreSQL，Neon、RDS 等托管服务都可以。DATABASE_URL 是内置数据源，管理员还可以在设置中添加更多数据库，每个检查选择自己读取的库。" },
      { q: "什么情况算检查失败？", a: "查出数据行表示需要关注；执行报错（比如字段被改名）才会标记为失败。" },
      { q: "谁可以注册？", a: "任何人都可以注册，默认是查看者角色，更高的角色由管理员分配。" },
    ],
  },
  cta: { titleTop: "找出那些", titleBottom: "本不该存在的数据。", primary: "体验在线演示", secondary: "自己部署" },
  footer: { tagline: "面向 PostgreSQL 的开源 SQL 数据检查工具。", product: "产品", demo: "在线演示", docs: "文档", mcp: "MCP 服务", project: "项目", guide: "部署文档", license: "Apache-2.0", language: "语言" },
};

export const landingCopy: Record<Language, LandingCopy> = { en, zh };
