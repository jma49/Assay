/**
 * Demo check scripts that run against the tables created by schema.sql.
 * Convention of the executor: rows returned = attention needed, no rows = OK.
 */
export interface DemoCheck {
  scriptId: string;
  name: string;
  cnName: string;
  description: string;
  cnDescription: string;
  hashtags: string[];
  isScheduled: boolean;
  cronSchedule: string;
  sqlContent: string;
}

export const DEMO_AUTHOR = "demo-seed";

export const demoChecks: DemoCheck[] = [
  {
    scriptId: "demo-duplicate-orders",
    name: "Duplicate orders",
    cnName: "重复下单",
    description:
      "Orders from the same customer with the same total placed within 5 minutes of each other.",
    cnDescription: "同一客户在 5 分钟内以相同金额重复下单。",
    hashtags: ["demo", "orders", "duplicates"],
    isScheduled: true,
    cronSchedule: "0 * * * *",
    sqlContent: `SELECT a.id AS order_id, b.id AS duplicate_order_id,
       a.customer_id, a.total, a.created_at, b.created_at AS duplicate_created_at
FROM demo.orders a
JOIN demo.orders b
  ON b.customer_id = a.customer_id
 AND b.total = a.total
 AND b.id > a.id
 AND b.created_at BETWEEN a.created_at AND a.created_at + interval '5 minutes'
ORDER BY a.id;`,
  },
  {
    scriptId: "demo-negative-inventory",
    name: "Negative inventory",
    cnName: "库存为负",
    description: "Products whose on-hand stock is below zero.",
    cnDescription: "现有库存小于 0 的商品。",
    hashtags: ["demo", "inventory"],
    isScheduled: true,
    cronSchedule: "*/30 * * * *",
    sqlContent: `SELECT p.sku, p.name, i.on_hand, i.reserved
FROM demo.inventory i
JOIN demo.products p ON p.id = i.product_id
WHERE i.on_hand < 0
ORDER BY i.on_hand;`,
  },
  {
    scriptId: "demo-paid-orders-missing-payment",
    name: "Paid orders without a payment",
    cnName: "已支付订单缺少支付记录",
    description: "Orders marked paid or shipped that have no payment record.",
    cnDescription: "状态为已支付或已发货，但没有任何支付记录的订单。",
    hashtags: ["demo", "orders", "payments"],
    isScheduled: true,
    cronSchedule: "0 9 * * *",
    sqlContent: `SELECT o.id AS order_id, o.customer_id, o.status, o.total, o.created_at
FROM demo.orders o
WHERE o.status IN ('paid', 'shipped')
  AND NOT EXISTS (SELECT 1 FROM demo.payments p WHERE p.order_id = o.id)
ORDER BY o.id;`,
  },
  {
    scriptId: "demo-payment-amount-mismatch",
    name: "Payment amount mismatch",
    cnName: "支付金额与订单不符",
    description: "Orders whose total payments differ from the order total.",
    cnDescription: "支付总额与订单金额不一致的订单。",
    hashtags: ["demo", "payments", "finance"],
    isScheduled: false,
    cronSchedule: "",
    sqlContent: `SELECT o.id AS order_id, o.total AS order_total,
       sum(p.amount) AS paid_total, o.total - sum(p.amount) AS difference
FROM demo.orders o
JOIN demo.payments p ON p.order_id = o.id
GROUP BY o.id, o.total
HAVING sum(p.amount) <> o.total
ORDER BY o.id;`,
  },
  {
    scriptId: "demo-invalid-customer-emails",
    name: "Invalid customer emails",
    cnName: "客户邮箱格式错误",
    description: "Customers whose email is empty, has whitespace or is malformed.",
    cnDescription: "邮箱为空、包含空白字符或格式不正确的客户。",
    hashtags: ["demo", "customers", "data-quality"],
    isScheduled: false,
    cronSchedule: "",
    sqlContent: `SELECT id, full_name, quote_literal(email) AS email
FROM demo.customers
WHERE email !~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
ORDER BY id;`,
  },
  {
    scriptId: "demo-stale-pending-orders",
    name: "Stale pending orders",
    cnName: "长时间未处理的待支付订单",
    description: "Orders still pending more than 7 days after being placed.",
    cnDescription: "下单超过 7 天仍处于待支付状态的订单。",
    hashtags: ["demo", "orders"],
    isScheduled: true,
    cronSchedule: "0 8 * * 1",
    sqlContent: `SELECT id AS order_id, customer_id, total, created_at,
       date_part('day', now() - created_at)::int AS days_pending
FROM demo.orders
WHERE status = 'pending' AND created_at < now() - interval '7 days'
ORDER BY created_at;`,
  },
  {
    scriptId: "demo-orphan-order-items",
    name: "Order items with unknown products",
    cnName: "订单明细引用了不存在的商品",
    description: "Order items that reference a product id missing from the catalog.",
    cnDescription: "订单明细中引用的商品 ID 在商品表中不存在。",
    hashtags: ["demo", "orders", "integrity"],
    isScheduled: false,
    cronSchedule: "",
    sqlContent: `SELECT oi.id AS order_item_id, oi.order_id, oi.product_id, oi.quantity
FROM demo.order_items oi
LEFT JOIN demo.products p ON p.id = oi.product_id
WHERE p.id IS NULL
ORDER BY oi.id;`,
  },
  {
    scriptId: "demo-price-below-cost",
    name: "Products priced below cost",
    cnName: "售价低于成本的商品",
    description: "Products whose selling price is lower than their unit cost.",
    cnDescription: "售价低于成本价的商品。",
    hashtags: ["demo", "products", "finance"],
    isScheduled: false,
    cronSchedule: "",
    sqlContent: `SELECT sku, name, price, cost, cost - price AS loss_per_unit
FROM demo.products
WHERE price < cost
ORDER BY loss_per_unit DESC;`,
  },
  {
    scriptId: "demo-refunds-exceed-payment",
    name: "Refunds larger than payment",
    cnName: "退款金额超过支付金额",
    description: "Payments refunded for more than was paid. Expected to be clean.",
    cnDescription: "退款金额大于实付金额的支付记录。正常情况下应无结果。",
    hashtags: ["demo", "payments", "finance"],
    isScheduled: false,
    cronSchedule: "",
    sqlContent: `SELECT id AS payment_id, order_id, amount, refunded
FROM demo.payments
WHERE refunded > amount;`,
  },
  {
    scriptId: "demo-future-dated-orders",
    name: "Future-dated orders",
    cnName: "下单时间在未来的订单",
    description: "Orders with a creation time in the future. Expected to be clean.",
    cnDescription: "创建时间晚于当前时间的订单。正常情况下应无结果。",
    hashtags: ["demo", "orders", "data-quality"],
    isScheduled: true,
    cronSchedule: "0 0 * * *",
    sqlContent: `SELECT id AS order_id, created_at
FROM demo.orders
WHERE created_at > now() + interval '5 minutes';`,
  },
  {
    scriptId: "demo-broken-shipping-check",
    name: "Shipping status check (broken)",
    cnName: "物流状态检查（故意出错）",
    description:
      "References a column that does not exist, to demo a failed run and AI error analysis.",
    cnDescription: "引用了不存在的字段，用于演示执行失败和 AI 错误分析。",
    hashtags: ["demo", "orders", "broken"],
    isScheduled: false,
    cronSchedule: "",
    sqlContent: `SELECT id AS order_id, shipping_status
FROM demo.orders
WHERE status = 'shipped' AND shipping_status IS NULL;`,
  },
];
