import { defineCopy } from "../../lib/i18n";

/**
 * Sources: the demo seed's sizes (scripts/demo/schema.sql) and the checks' last real runs on Sep 29 and Oct 19.
 * Nothing composed: every count is a real run's.
 */
export const interludeCopy = defineCopy({
  en: {
    title: (
      <>
        Every table, held
        <br className="br-en" /> up to the light.
      </>
    ),
    lede: "The six tables of the demo shop, one line per row. Where a check returned a row, its line is lit.",
    caption: (
      <>
        Generated from the demo seed (<code>scripts/demo/schema.sql</code>): one line per row, shaded by its values where the seed fixes them and by the
        seed&apos;s own ranges elsewhere. Lit: the rows each check returned in its last real run (Sep 29, Oct 19).
      </>
    ),
    rows: { 200: "200 rows", 60: "60 rows", 1506: "1,506 rows" },
    checks: {
      emails: "Invalid customer emails",
      cost: "Products priced below cost",
      stock: "Negative inventory",
      dup: "Duplicate orders",
      unpaid: "Paid orders without a payment",
      mismatch: "Payment amount mismatch",
      stale: "Stale pending orders",
      orphans: "Order items with unknown products",
      refunds: "Refunds larger than payment",
    },
    n: { 2: "2 rows", 3: "3 rows", 4: "4 rows", 5: "5 rows", 6: "6 rows", 74: "74 rows" },
    clean: "0 rows · Clean",
    wall: "The six demo tables",
  },
  zh: {
    title: (
      <>
        把每一张表，
        <br />
        都放到灯下。
      </>
    ),
    lede: "演示商店的六张表，每一行是一条线。检查返回了哪一行，哪一行就亮起来。",
    caption: (
      <>
        由演示种子数据（<code>scripts/demo/schema.sql</code>）生成：一行一条线，种子固定的值按原值定浓淡，其余按种子自己的取值范围绘制。亮起的线：每个检查最近一次真实运行（9 月
        29 日、10 月 19 日）返回的行。
      </>
    ),
    rows: { 200: "200 行", 60: "60 行", 1506: "1,506 行" },
    checks: {
      emails: "客户邮箱格式错误",
      cost: "售价低于成本的商品",
      stock: "库存为负",
      dup: "重复下单",
      unpaid: "已支付订单缺少支付记录",
      mismatch: "支付金额与订单不符",
      stale: "长时间未处理的待支付订单",
      orphans: "订单明细引用了不存在的商品",
      refunds: "退款金额超过支付金额",
    },
    n: { 2: "2 行", 3: "3 行", 4: "4 行", 5: "5 行", 6: "6 行", 74: "74 行" },
    clean: "0 行 · 正常",
    wall: "演示商店的六张表",
  },
});
