import { defineCopy } from "../../lib/i18n";

/**
 * The hero's words and the idle cycle's readouts. `idle` is drawn on the film's canvas: `{name}` slots are filled by
 * idle-exposure.ts and idle-registration.ts; the gap label must stay exactly as
 * lib/film.ts prints it (the readout hands back to it by a cut).
 */
export const heroCopy = defineCopy({
  en: {
    lines: ["Hold your", "data up to", "the light."],
    lede: "assay runs read-only SQL checks on PostgreSQL, on a schedule. A check should return nothing: every row it returns is a problem, and a query that breaks never passes for clean.",
    demo: "Open the live demo",
    github: "Star on GitHub",
    /** Under the CTAs for a guest: demo mode opens the demo without an account; otherwise sign-in is needed. */
    guestNote: "No sign-up. A sample shop database with problems planted in it. Apache-2.0.",
    signInNote: "Sign in with Google or GitHub. New accounts join the demo workspace as viewers.",
    run: "Run · Oct 19, 23:00 UTC",
    reading: (
      <>
        Duplicate orders returned <b>6 rows</b>: orders <code>1–6</code> and their copies <code>1501–1506</code>, same customer, same total, placed 40 seconds
        apart, 1,500 rows apart on the same film.
      </>
    ),
    replay: "Switch on again",
    idle: {
      pair: ["ORDER {order} / {copy} · CUSTOMER {customer} · {total} · +40 S", "{order} / {copy} · CUSTOMER {customer} · {total} · +40 S", "{order} / {copy} · +40 S"],
      pairShort: "{order} / {copy} · +40 S",
      summary: ["6 PAIRS · SAME CUSTOMER, SAME TOTAL · 40 S APART", "6 PAIRS · 40 S APART"],
      counter: "READING ROW {nSpaced}",
      gap: "ROWS {from}–{toSpaced} · NOT RETURNED",
    },
  },
  zh: {
    lines: ["把数据", "放到灯下", "看清楚。"],
    lede: "assay 在 PostgreSQL 上按计划运行只读 SQL 检查。一个检查本该什么也查不到：它返回的每一行都是一个问题；查询本身出错时，绝不会被当成数据正常。",
    demo: "打开在线演示",
    github: "在 GitHub 上点星",
    guestNote: "无需注册。一个埋好问题的示例商店数据库。Apache-2.0 开源。",
    signInNote: "用 Google 或 GitHub 登录，新账号会以查看者身份进入演示工作区。",
    run: "运行 · 10 月 19 日 23:00 UTC",
    reading: (
      <>
        重复下单检查返回了 <b>6 行</b>：订单 <code>1–6</code> 和它们的副本 <code>1501–1506</code>，客户相同、金额相同，相隔 40 秒下单，在同一张底片上相距 1500 行。
      </>
    ),
    replay: "重新开灯",
    idle: {
      pair: ["订单 {order} / {copy} · 客户 {customer} · {total} · 晚 40 秒", "{order} / {copy} · 客户 {customer} · {total} · 晚 40 秒", "{order} / {copy} · 晚 40 秒"],
      pairShort: "{order} / {copy} · 晚 40 秒",
      summary: ["6 对 · 同一客户、同一金额 · 相隔 40 秒", "6 对 · 相隔 40 秒"],
      counter: "读取第 {n} 行",
      gap: "第 {from}–{to} 行 · 共 {countSpaced} 行 · 未返回",
    },
  },
});

export type IdleCopy = (typeof heroCopy)["en"]["idle"];
