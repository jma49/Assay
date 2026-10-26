import { defineCopy } from "../../lib/i18n";

/**
 * Sources: scripts/demo/checks.ts:146-157; run.ts:9-16; notify.ts:81, 95; run-check.ts:207, and the demo checks'
 * last real runs. Real past runs of the demo workspace's checks; no schedule is shown next to a demo check.
 */
export const outcomesCopy = defineCopy({
  en: {
    title: (
      <>
        A check should
        <br />
        come back empty.
      </>
    ),
    lede: "A check is one read-only query, and every row it returns is a problem. A run ends one of three ways, and the three never look alike.",
    panels: "Three outcomes",
    rebate: { clean: "0 rows", issues: "6 rows", broken: "broken" },
    clean: {
      state: "Clean",
      n: "0 rows",
      p: "The query read the table and returned nothing. That is the state you want.",
      check: "Refunds larger than payment",
      when: "Sep 29, 11:55 UTC",
    },
    issues: {
      state: "Issues",
      n: "6 rows",
      p: "Every lit row is a problem. Orders 1 to 6 were placed again 40 seconds later as 1501 to 1506.",
      check: "Duplicate orders",
      when: "Oct 19, 23:00 UTC",
    },
    broken: {
      state: "Broken",
      n: "query failed",
      p: "The query itself failed, so nothing was checked. A failed query never passes for clean data.",
      check: "Shipping status check (broken)",
      when: "Sep 29, 11:55 UTC",
    },
    lit1: "Orders 1 to 6",
    lit2: "Copies 1501 to 1506, placed 40 seconds later",
    err: "Query failed · nothing read",
    note: (
      <>
        Real runs of the demo workspace’s checks (<code>scripts/demo</code>).
      </>
    ),
  },
  zh: {
    title: (
      <>
        检查的结果，
        <br />
        应该是空的。
      </>
    ),
    lede: "一个检查就是一条只读查询，返回的每一行都是问题。每次运行只有三种结果，三种结果绝不会看起来一样。",
    panels: "三种结果",
    rebate: { clean: "0 行", issues: "6 行", broken: "出错" },
    clean: {
      state: "正常",
      n: "0 行",
      p: "查询读完了整张表，什么都没返回。这正是你想要的结果。",
      check: "退款金额超过支付金额",
      when: "9 月 29 日 11:55 UTC",
    },
    issues: {
      state: "有问题",
      n: "6 行",
      p: "亮起的每一行都是问题。订单 1 到 6 在 40 秒后又被下了一次，编号 1501 到 1506。",
      check: "重复下单",
      when: "10 月 19 日 23:00 UTC",
    },
    broken: {
      state: "出错",
      n: "查询失败",
      p: "查询本身失败了，所以什么都没检查。失败的查询绝不会被当成数据正常。",
      check: "物流状态检查（故意出错）",
      when: "9 月 29 日 11:55 UTC",
    },
    lit1: "订单 1 到 6",
    lit2: "40 秒后重复下的订单 1501 到 1506",
    err: "查询失败 · 什么都没读到",
    note: (
      <>
        演示工作区里这些检查的真实运行结果（<code>scripts/demo</code>）。
      </>
    ),
  },
});

/** Printed on the films (never translated: table names, columns, values and the PostgreSQL error as the app shows it). */
export const FILM = {
  payments: { table: "demo.payments", cols: ["id", "order_id", "amount", "refunded"] },
  orders: { table: "demo.orders", cols: ["id", "customer_id", "total", "created_at"] },
  error: ['column "shipping_status"', "does not exist"],
} as const;

/** Duplicate orders, run 6ad6a0f58531e0f4d766c4b7 (2026-10-19T23:00:05Z): orders 1-6 and their copies 1501-1506. */
type Row = readonly [id: string, customer: string, total: string, day: string, time: string];
export const ORIGINALS: readonly Row[] = [
  ["1", "20", "840.10", "08-15", "19:09:17"],
  ["2", "105", "1321.48", "09-16", "21:56:22"],
  ["3", "12", "1975.33", "08-03", "07:14:30"],
  ["4", "56", "226.62", "07-19", "20:10:06"],
  ["5", "147", "166.14", "08-30", "04:30:43"],
  ["6", "159", "839.10", "08-05", "18:09:14"],
];
export const COPIES: readonly Row[] = [
  ["1501", "20", "840.10", "08-15", "19:09:57"],
  ["1502", "105", "1321.48", "09-16", "21:57:02"],
  ["1503", "12", "1975.33", "08-03", "07:15:10"],
  ["1504", "56", "226.62", "07-19", "20:10:46"],
  ["1505", "147", "166.14", "08-30", "04:31:23"],
  ["1506", "159", "839.10", "08-05", "18:09:54"],
];
