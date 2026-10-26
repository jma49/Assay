import { defineCopy } from "../../lib/i18n";

/**
 * Sources: approvals, scripts/demo/checks.ts:200-278; the broken run, checks.ts:172-184 (live run 2026-09-29); MCP
 * tool names, src/server/mcp/tools.ts:87-271. The triage answer and the
 * MCP call are composed and labelled Example. Data (emails, comments, SQL, JSON) stays as the demo stores it.
 */
export const workflowCopy = defineCopy({
  en: {
    title: (
      <>
        Reviewed by people.
        <br />
        Explained by AI.
        <br />
        Read by agents.
      </>
    ),
    lede: "A check from anyone but an admin waits for review before it runs. AI explains a broken run when you ask. Agents read the same checks through MCP.",
    ex: "Example",
    slate: { frames: "frames", review: "Review", triage: "AI triage", end: "End" },
    f1: {
      op: "New check",
      name: "Orders without items",
      pending: "Pending",
      approve: "Approve",
      reject: "Reject",
      wait: "Waiting for a manager or an admin",
      hist: "Approval history",
      rev: "reviewed by",
      approved: "Approved",
      rejected: "Rejected",
      d1: "Negative inventory · edit",
      d2: "All customers · new check",
    },
    f2: {
      name: "Shipping status check (broken)",
      broken: "Broken",
      fog: "the query failed, nothing was read",
      run: "Triage the latest run",
      kind: "Problem in the check",
      sum: "The query is wrong, not the data: demo.orders has no shipping_status column.",
      next: "Next step: find the column that holds the shipping state, then update the query.",
      sent: "Sent to the model",
      sentv: "the SQL, the error, the schema",
      never: "Never sent",
      neverv: "the returned rows (an error message or a literal in the SQL can still quote a value)",
    },
    f3: { tools: "8 tools" },
    captions: [
      {
        title: "Review before it runs",
        body: "Creating a check, deleting one or editing someone else’s waits for a manager or an admin. Every decision is kept with its comment.",
      },
      {
        title: "AI triage, when you ask",
        body: "Ask on a broken or flagged run: triage says whether the query or the data is wrong. The model reads the SQL, the error, the schema and, if rows came back, a column profile (types, nulls, distinct counts). Never the returned rows, though an error message or a literal in the SQL can quote a value. AI stays off until you turn it on.",
      },
      {
        title: "Agents through MCP",
        body: "Any MCP client, such as Claude Code or Cursor, signs in with OAuth or a personal API key. Eight tools read checks and runs, run a check, and acknowledge or mute an alert. Agents cannot create or edit checks.",
      },
    ],
    ctl: { group: "Frames", prev: "Previous frame", next: "Next frame" },
  },
  zh: {
    title: (
      <>
        有人审核，
        <br />
        有 AI 解释，
        <br />
        有智能体来读。
      </>
    ),
    lede: "除管理员以外，任何人提交的检查都要先经过审核才会运行。运行出错时，可以请 AI 解释原因。智能体通过 MCP 读取同一批检查。",
    ex: "示例",
    slate: { frames: "格", review: "审核", triage: "AI 分诊", end: "完" },
    f1: {
      op: "新建检查",
      name: "没有明细的订单",
      pending: "待审批",
      approve: "批准",
      reject: "拒绝",
      wait: "等待经理或管理员审批",
      hist: "审批历史",
      rev: "审核人",
      approved: "已批准",
      rejected: "已拒绝",
      d1: "库存为负 · 修改",
      d2: "所有客户 · 新建检查",
    },
    f2: {
      name: "物流状态检查（故意出错）",
      broken: "出错",
      fog: "查询失败，一行也没有读到",
      run: "分诊最新一次执行",
      kind: "检查本身有误",
      sum: "出错的是查询，不是数据：demo.orders 里没有 shipping_status 这一列。",
      next: "下一步：先确认哪一列记录物流状态，再修改查询。",
      sent: "发给模型的",
      sentv: "SQL、错误信息、表结构",
      never: "从不发送",
      neverv: "返回的行（错误信息或 SQL 里的字面量仍可能带出某个值）",
    },
    f3: { tools: "8 个工具" },
    captions: [
      {
        title: "运行之前，先审核",
        body: "新建检查、删除检查、修改别人的检查，都要等经理或管理员批准。每一次决定都连同评语一起保留。",
      },
      {
        title: "AI 分诊，按需发起",
        body: "在出错或有问题行的运行上发起，分诊会判断错在查询还是错在数据。模型读到 SQL、错误信息、表结构；有返回行时再加上列概况（类型、空值数、不同值个数）。从不读取返回的行，不过错误信息或 SQL 里的字面量可能带出某个值。AI 默认关闭，开启后才可用。",
      },
      {
        title: "智能体通过 MCP 接入",
        body: "任何 MCP 客户端（例如 Claude Code、Cursor）都可以用 OAuth 或个人 API 密钥登录。八个工具可以读取检查和运行记录、执行检查、确认或静音告警。智能体不能新建或修改检查。",
      },
    ],
    ctl: { group: "胶片画格", prev: "上一格", next: "下一格" },
  },
});
