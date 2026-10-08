/**
 * Language-neutral data shown on the landing page. Names, schedules, SQL and row
 * counts come from scripts/demo/checks.ts and the live demo workspace, so the page
 * shows what the demo really contains.
 */

export type Outcome = "clean" | "issues" | "broken";

export interface HeroCheck {
  id: string;
  name: { en: string; zh: string };
  outcome: Outcome;
  rows?: number;
  schedule: { en: string; zh: string };
}

export const HERO_CHECKS: HeroCheck[] = [
  { id: "demo-duplicate-orders", name: { en: "Duplicate orders", zh: "重复下单" }, outcome: "issues", rows: 6, schedule: { en: "Every hour", zh: "每小时" } },
  { id: "demo-broken-shipping-check", name: { en: "Shipping status check (broken)", zh: "物流状态检查（故意出错）" }, outcome: "broken", schedule: { en: "Manual", zh: "手动" } },
  { id: "demo-negative-inventory", name: { en: "Negative inventory", zh: "库存为负" }, outcome: "issues", rows: 3, schedule: { en: "Every 30 min", zh: "每 30 分钟" } },
  { id: "demo-future-dated-orders", name: { en: "Future-dated orders", zh: "下单时间在未来的订单" }, outcome: "clean", schedule: { en: "Daily 00:00", zh: "每天 00:00" } },
  { id: "demo-paid-orders-missing-payment", name: { en: "Paid orders without a payment", zh: "已支付订单缺少支付记录" }, outcome: "issues", rows: 5, schedule: { en: "Daily 09:00", zh: "每天 09:00" } },
];

/** The four problems planted in the demo, with the SQL each check runs. */
export const SCENARIO_SQL = [
  `SELECT a.id AS order_id, b.id AS duplicate_order_id
FROM demo.orders a
JOIN demo.orders b
  ON b.customer_id = a.customer_id
 AND b.total = a.total AND b.id > a.id
 AND b.created_at BETWEEN a.created_at
     AND a.created_at + interval '5 minutes';`,
  `SELECT p.sku, p.name, i.on_hand, i.reserved
FROM demo.inventory i
JOIN demo.products p ON p.id = i.product_id
WHERE i.on_hand < 0;`,
  `SELECT o.id AS order_id, o.status, o.total
FROM demo.orders o
WHERE o.status IN ('paid', 'shipped')
  AND NOT EXISTS (SELECT 1 FROM demo.payments p
                  WHERE p.order_id = o.id);`,
  `SELECT id AS order_id, shipping_status
FROM demo.orders
WHERE status = 'shipped'
  AND shipping_status IS NULL;`,
] as const;

export const SCENARIO_META: { outcome: Outcome; rows?: number }[] = [
  { outcome: "issues", rows: 6 },
  { outcome: "issues", rows: 3 },
  { outcome: "issues", rows: 5 },
  { outcome: "broken" },
];

/** The first rows of the live demo's latest Duplicate orders run. */
export const DUPLICATE_ROWS = [
  ["1", "1501", "20", "840.10"],
  ["2", "1502", "105", "1321.48"],
  ["3", "1503", "12", "1975.33"],
  ["4", "1504", "56", "226.62"],
] as const;

/** Stale pending orders on Sep 29 in the live demo: 8 new, 0 still open, 7 fixed. */
export const STALE_DIFF = { added: 8, still: 0, fixed: 7 } as const;

export const DEMO_TABLES = ["orders", "payments", "products", "inventory", "customers", "order_items"] as const;

export const SCHEDULES = [
  { name: { en: "Negative inventory", zh: "库存为负" }, cron: "*/30 * * * *" },
  { name: { en: "Duplicate orders", zh: "重复下单" }, cron: "0 * * * *" },
  { name: { en: "Paid orders without a payment", zh: "已支付订单缺少支付记录" }, cron: "0 9 * * *" },
] as const;

/** Run history strips in the hero window: deterministic, so the server and client render the same. */
export function runStrip(outcome: Outcome, seed: number, length = 20): Outcome[] {
  return Array.from({ length }, (_, k) => (outcome === "issues" && (k + seed) % 7 === 0 ? "clean" : outcome));
}
