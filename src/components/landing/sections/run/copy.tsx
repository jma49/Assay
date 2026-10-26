import { defineCopy } from "../../lib/i18n";

/** Sources: scripts/demo/checks.ts:49-53 and the demo check's run of Oct 19; the alert is notify.ts:86-99. */
export const runCopy = defineCopy({
  en: {
    title: <>One run, read on the light&nbsp;box.</>,
    lede: "Every run takes the same four steps, whether a schedule, a person or an agent starts it.",
    steps: [
      {
        title: "The query is the exposure",
        body: "The check's SQL is validated as read-only when it is saved and again before every run, then runs in a read-only transaction under a statement timeout, 30 seconds by default. This one asks for every product whose stock is below zero.",
      },
      {
        title: "Every row it returns lights up",
        body: "No rows is a clear film: Clean. Rows are marks of light: Issues. In the live demo's run of Oct 19, 23:30 UTC, three products were below zero.",
      },
      {
        title: "Laid over the last run",
        body: "Every row is matched with the previous run, so you see what changed: lit on both films is still open, lit only on the new film is new, lit only on the old one is fixed.",
      },
      {
        title: "Only a change leaves the room",
        body: "An alert goes out only when something changed: new rows, a query that breaks, a check that is clean again. It goes to Slack, Discord, Telegram, Feishu, WeCom or a webhook.",
      },
    ],
    lead: {
      table: "demo.inventory · 60 rows",
      runA: "Run · Oct 19 · 23:30 UTC",
      check: "Negative inventory",
      runB: "Next run · +30 min · Example",
      sql: "check · SQL",
    },
    filmCaption:
      "Film of demo.inventory, all 60 rows. The run of Oct 19, 23:30 UTC returned three: SKU-0007 Chair 7, SKU-0023 Mouse 23 and SKU-0041 Mouse 41, each with on_hand -3. Laid over it, an example of the next run: SKU-0052 Keyboard 52 is new, SKU-0007 and SKU-0041 are still open, SKU-0023 is fixed.",
    timeout: "30 s by default",
    example: "Example",
    runA: "Run · Oct 19, 23:30 UTC",
    rows: "rows",
    issues: "Issues",
    realA: "A real run of the live demo.",
    runB: "Next run, 30 min later",
    change: { new: "new", still: "still open", fixed: "fixed" },
    rowKey: "A row is matched by all of its values.",
    alert: {
      title: "Negative inventory: 1 row new",
      line1: "Now returns 3 rows",
      line2: "1 new, 2 still open, 1 fixed",
      open: "Open check",
      ack: "Acknowledge",
      mute: "Mute 24 h",
      caption: "Slack, through the assay app: the words are exactly what assay sends. Acknowledge and Mute appear only there and in Telegram.",
    },
    read: { returned: "returned", notReturned: "not returned" },
  },
  zh: {
    title: (
      <>
        一次运行，
        <br />
        放在灯箱上
        <br />
        读清楚。
      </>
    ),
    lede: "无论是按计划、有人手动，还是 AI 助手通过 MCP 触发，每次运行都走同样的四步。",
    steps: [
      {
        title: "查询就是曝光",
        body: "检查的 SQL 在保存时和每次运行前都会做只读校验，再放进只读事务里执行，并受语句超时限制（默认 30 秒）。这一条要找的是库存小于 0 的商品。",
      },
      {
        title: "返回的每一行都会亮起",
        body: "没有结果就是一张干净的底片：正常。有结果就是亮起的光斑：有问题。在线演示 10 月 19 日 23:30 UTC 的这次运行里，有三个商品库存小于 0。",
      },
      {
        title: "和上一次叠在一起比对",
        body: "每一行都和上一次运行比对，你看到的是变化：两张底片上都亮的仍未解决，只在新底片上亮的是新增，只在旧底片上亮的已修复。",
      },
      {
        title: "只有变化才会离开这间屋子",
        body: "只有发生变化才会发告警：出现新的问题行、查询出错、或者恢复正常。告警发到 Slack、Discord、Telegram、飞书、企业微信或 Webhook。",
      },
    ],
    lead: {
      table: "demo.inventory · 60 行",
      runA: "10 月 19 日 23:30 UTC",
      check: "库存为负",
      runB: "下一次运行 · +30 分钟 · 示例",
      sql: "检查 · SQL",
    },
    filmCaption:
      "demo.inventory 的底片，60 行全部印出。10 月 19 日 23:30 UTC 的运行返回了其中三行：SKU-0007 Chair 7、SKU-0023 Mouse 23、SKU-0041 Mouse 41，on_hand 都是 -3。叠在上面的是下一次运行的示例：SKU-0052 Keyboard 52 是新增，SKU-0007 和 SKU-0041 仍未解决，SKU-0023 已修复。",
    timeout: "默认 30 秒",
    example: "示例",
    runA: "运行 · 10 月 19 日 23:30 UTC",
    rows: "行",
    issues: "有问题",
    realA: "在线演示里的一次真实运行。",
    runB: "下一次运行，30 分钟后",
    change: { new: "新增", still: "仍未解决", fixed: "已修复" },
    rowKey: "一行数据按它的全部字段值来识别。",
    alert: {
      title: "库存为负 新增 1 行问题数据",
      line1: "当前返回 3 行",
      line2: "新增 1 行，仍存在 2 行，已修复 1 行",
      open: "查看检查",
      ack: "确认处理",
      mute: "静音 24 小时",
      caption: "通过 assay 应用发到 Slack：文字就是 assay 实际发送的内容。“确认处理”和“静音”按钮只在这里和 Telegram 里出现。",
    },
    read: { returned: "被返回", notReturned: "未返回" },
  },
});

export type RunCopy = (typeof runCopy)["en"];
