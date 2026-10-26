/**
 * The strings the film renderer (film.ts) draws on canvas or prints in the hero's reading line, in a typed table like
 * every section's copy. `{name}` slots are filled by `fill()`; the reading line is HTML (the row's id in <b>).
 */
import { defineCopy } from "./i18n";

export const filmCopy = defineCopy({
  en: {
    // a film's lead letters at its four corners; the demo runs when a visitor presses Run, so the schedule is an example
    lead: {
      orders: { tl: "DEMO.ORDERS", tr: "1 506 ROWS", bl: "DUPLICATE ORDERS", br: "EVERY HOUR · EXAMPLE" },
      clean: { tl: "DEMO.PAYMENTS", tr: "0 ROWS RETURNED", bl: "SEP 29 · 11:55 UTC", br: "CLEAN" },
    },
    // the label over the compressed middle of a ledger
    gap: "ROWS {from}–{toSpaced} · NOT RETURNED",
    reading: {
      duplicated: "<b>order {id}</b> · customer {customer} · {total} · copied as {copy}",
      copy: "<b>order {id}</b> · customer {customer} · {total} · copy of {order}, 40 s later",
      notReturned: "order {id} · not returned",
    },
  },
  zh: {
    lead: {
      orders: { tl: "DEMO.ORDERS", tr: "1 506 行", bl: "重复下单", br: "每小时 · 示例" },
      clean: { tl: "DEMO.PAYMENTS", tr: "返回 0 行", bl: "9 月 29 日 · 11:55 UTC", br: "正常" },
    },
    gap: "第 {from}–{to} 行 · 共 {count} 行 · 未返回",
    reading: {
      duplicated: "<b>订单 {id}</b> · 客户 {customer} · {total} · 副本是 {copy}",
      copy: "<b>订单 {id}</b> · 客户 {customer} · {total} · 订单 {order} 的副本，晚 40 秒",
      notReturned: "订单 {id} · 未返回",
    },
  },
});

/** Fills `{name}` slots in a copy string. */
export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]));
