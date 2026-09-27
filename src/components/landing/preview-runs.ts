/** Sample runs for the landing page's product preview, shaped like the demo database. */
type Text = { en: string; zh: string };

export interface PreviewRun {
  id: string;
  name: Text;
  description: Text;
  status: "passed" | "attention" | "failed";
  columns?: Text[];
  /** Columns aligned right (numbers). */
  numeric?: number[];
  rows?: (string | number)[][];
  error?: string;
}

export const PREVIEW_RUNS: PreviewRun[] = [
  {
    id: "duplicate-orders",
    name: { en: "Duplicate orders", zh: "重复下单" },
    description: { en: "Same customer, same total, within 5 minutes", zh: "同一客户 5 分钟内以相同金额重复下单" },
    status: "attention",
    columns: [
      { en: "Order", zh: "订单" },
      { en: "Duplicate", zh: "重复订单" },
      { en: "Customer", zh: "客户" },
      { en: "Total", zh: "金额" },
    ],
    numeric: [3],
    rows: [
      ["#12", "#1501", 88, "$412.60"],
      ["#19", "#1502", 141, "$96.40"],
      ["#23", "#1503", 7, "$1,208.00"],
      ["#31", "#1504", 162, "$57.99"],
      ["#44", "#1505", 23, "$640.15"],
      ["#58", "#1506", 105, "$233.70"],
    ],
  },
  {
    id: "negative-inventory",
    name: { en: "Negative inventory", zh: "库存为负" },
    description: { en: "Products whose on-hand stock is below zero", zh: "现有库存小于 0 的商品" },
    status: "attention",
    columns: [
      { en: "SKU", zh: "SKU" },
      { en: "Product", zh: "商品" },
      { en: "On hand", zh: "现有库存" },
      { en: "Reserved", zh: "已预留" },
    ],
    numeric: [2, 3],
    rows: [
      ["SKU-0007", "Standing desk", -4, 2],
      ["SKU-0023", "Desk lamp", -1, 0],
      ["SKU-0041", "Office chair", -12, 3],
    ],
  },
  {
    id: "refunds-exceed-payment",
    name: { en: "Refunds larger than payment", zh: "退款超过支付金额" },
    description: { en: "Payments refunded for more than was paid", zh: "退款金额超过实际支付金额的记录" },
    status: "passed",
  },
  {
    id: "stale-pending-orders",
    name: { en: "Stale pending orders", zh: "超期待支付订单" },
    description: { en: "Still pending 7 days after being placed", zh: "下单 7 天后仍未支付的订单" },
    status: "attention",
    columns: [
      { en: "Order", zh: "订单" },
      { en: "Customer", zh: "客户" },
      { en: "Placed", zh: "下单时间" },
      { en: "Days", zh: "天数" },
    ],
    numeric: [3],
    rows: [
      ["#2104", 55, "Sep 12", 14],
      ["#2111", 208, "Sep 13", 13],
      ["#2129", 17, "Sep 15", 11],
      ["#2140", 96, "Sep 16", 10],
      ["#2152", 131, "Sep 17", 9],
      ["#2163", 44, "Sep 18", 8],
      ["#2170", 189, "Sep 19", 7],
    ],
  },
  {
    id: "broken-shipping-check",
    name: { en: "Shipping status check", zh: "物流状态检查" },
    description: { en: "A check that refers to a column that does not exist", zh: "引用了不存在的列的检查" },
    status: "failed",
    error: 'ERROR:  column o.shipping_status does not exist\nLINE 3:   AND o.shipping_status = \'lost\'\n              ^\nHINT:  Perhaps you meant to reference the column "o.status".',
  },
  {
    id: "future-dated-orders",
    name: { en: "Future-dated orders", zh: "未来时间的订单" },
    description: { en: "Orders with a creation time in the future", zh: "创建时间在未来的订单" },
    status: "passed",
  },
];
