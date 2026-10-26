import { defineCopy } from "../../lib/i18n";

/** Sources for every answer: docs/en/faq.md and the code it cites. */
export const faqCopy = defineCopy({
  en: {
    title: (
      <>
        Before you point it
        <br className="br-en" /> at production.
      </>
    ),
    more: "More answers in the docs",
    items: [
      {
        q: "Which databases can it check?",
        a: (
          <p>
            PostgreSQL, and anything that speaks its protocol, such as Neon or Supabase. <code>DATABASE_URL</code> is the built-in source; admins add more
            PostgreSQL databases in Settings, and each check picks one. Connection strings are sealed with <span className="nw">AES-256-GCM</span> and never
            returned or logged.
          </p>
        ),
      },
      {
        q: "Can a check change my data?",
        a: (
          <p>
            No. The SQL is validated as read-only when the check is saved and again before every run, then runs inside <code>BEGIN READ ONLY</code> with a
            statement timeout: 30 s by default, settable from 1 to 255 s. For a second lock, give assay a role that can only <code>SELECT</code>; Test
            connection warns when the role could write.
          </p>
        ),
      },
      {
        q: "What counts as Broken?",
        a: (
          <>
            <p>
              A check that could not run: a syntax error, a renamed column, a timeout, a lost connection. Rows are Issues, a finding. Broken is its own state
              with its own alert, so a failing query is never read as Clean.
            </p>
            <p className="hg-proof proof">column &quot;shipping_status&quot; does not exist</p>
          </>
        ),
      },
      {
        q: "How do alerts work?",
        a: (
          <p>
            Only a change sends one: a check breaks, finds rows, gets new rows or is clean again. Alerts go to Slack, Discord, Telegram, Feishu, WeCom or a
            signed webhook. Telegram, and Slack connected with Add to Slack, carry Acknowledge and Mute 24 h buttons; elsewhere, use the Alerts menu on the
            check page.
          </p>
        ),
      },
      {
        q: "What does the AI see?",
        a: (
          <p>
            AI is off unless the workspace sets <code>AI_ENABLED</code>, and triage runs only when someone asks for it on a run. It gets the check&apos;s SQL,
            the outcome and error, the row count, the schema and a column profile (types, nulls, distinct values). It never gets the row values, though an
            error message or the SQL itself can quote one.
          </p>
        ),
      },
      {
        q: "Who can sign up?",
        a: (
          <p>
            Anyone, unless the workspace limits sign-up to company domains with <code>ALLOWED_EMAIL_DOMAINS</code>. New accounts are viewers; an admin gives
            out the developer, manager and admin roles.
          </p>
        ),
      },
      {
        q: "What does it cost?",
        a: (
          <p>
            assay is open source under Apache-2.0, with no license fee. You run it yourself, so the costs are the services under it: a host for the Next.js
            app (the guide uses Vercel), MongoDB, the PostgreSQL you already have and, if you want them, Upstash Redis and QStash. With AI on, its model calls
            go through your own Vercel AI Gateway account.
          </p>
        ),
      },
    ],
  },
  zh: {
    title: (
      <>
        接入生产库之前，
        <br />
        先看这几条。
      </>
    ),
    more: "文档里还有更多问答",
    items: [
      {
        q: "可以检查哪些数据库？",
        a: (
          <p>
            PostgreSQL，以及兼容它协议的数据库，比如 Neon、Supabase。<code>DATABASE_URL</code> 是内置数据源；管理员可以在设置里添加更多 PostgreSQL
            数据库，每个检查选一个来读。连接串用 <span className="nw">AES-256-GCM</span> 加密保存，不会被返回，也不会写进日志。
          </p>
        ),
      },
      {
        q: "检查会修改我的数据吗？",
        a: (
          <p>
            不会。SQL 在保存检查时做一次只读校验，每次运行前再校验一次，然后在 <code>BEGIN READ ONLY</code> 事务里执行，并有语句超时：默认 30 秒，可设为 1 到
            255 秒。再加一道锁：给 assay 一个只能 <code>SELECT</code> 的数据库角色；角色能写入时，“测试连接”会提醒你。
          </p>
        ),
      },
      {
        q: "什么算“出错”？",
        a: (
          <>
            <p>
              检查没能跑完：语法错误、列被改名、超时、连接断开。查出数据行是“有问题”，那是发现，不是故障。出错是单独的状态，有单独的告警，失败的查询绝不会被当成“正常”。
            </p>
            <p className="hg-proof proof">column &quot;shipping_status&quot; does not exist</p>
          </>
        ),
      },
      {
        q: "告警怎么发？",
        a: (
          <p>
            只有变化才会发：检查出错、查出数据、出现新行，或恢复正常。告警可以发到 Slack、Discord、Telegram、飞书、企业微信或带签名的 webhook。Telegram，以及通过
            Add to Slack 接入的 Slack，消息里带“确认处理”和“静音 24 小时”按钮；其他渠道请在检查页面的告警菜单里操作。
          </p>
        ),
      },
      {
        q: "AI 能看到什么？",
        a: (
          <p>
            工作区没有设置 <code>AI_ENABLED</code>{" "}
            时，AI 不会启用；启用后，也只有有人在某次运行上请求分析时才会调用。它拿到检查的 SQL、运行结果和错误信息、行数、表结构，以及列的统计概况（类型、空值数、不同值的个数），从不包括行里的数据。不过，错误信息或
            SQL 本身可能引用某个值。
          </p>
        ),
      },
      {
        q: "谁可以注册？",
        a: (
          <p>
            任何人都可以，除非工作区用 <code>ALLOWED_EMAIL_DOMAINS</code> 限定了公司域名。新账号默认是查看者；开发者、经理和管理员角色由管理员分配。
          </p>
        ),
      },
      {
        q: "要花多少钱？",
        a: (
          <p>
            assay 以 Apache-2.0 开源，没有授权费用。它由你自己部署，所以费用只来自它依赖的服务：运行 Next.js 应用的主机（部署文档以 Vercel 为例）、MongoDB、你已有的
            PostgreSQL，以及按需选用的 Upstash Redis 和 QStash。启用 AI 后，模型调用走你自己的 Vercel AI Gateway 账户。
          </p>
        ),
      },
    ],
  },
});
