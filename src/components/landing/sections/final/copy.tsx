import { defineCopy } from "../../lib/i18n";

/** The final's words. The run is real (demo.payments, Sep 29). */
export const finalCopy = defineCopy({
  en: {
    title: <>Find the rows that shouldn&apos;t exist.</>,
    check: "Refunds larger than payment",
    count: "0 rows · Clean",
    run: "Run · Sep 29, 11:55 UTC",
    reading: (
      <>
        Refunds larger than payment read <code>demo.payments</code> and returned 0 rows: a clear film.
      </>
    ),
    demo: "Open the live demo",
    github: "Star on GitHub",
    note: "loads the same sample shop into your own PostgreSQL.",
  },
  zh: {
    title: (
      <>
        找出那些
        <br />
        本不该存在的数据。
      </>
    ),
    check: "退款金额超过支付金额",
    count: "0 行 · 正常",
    run: "运行 · 9 月 29 日 11:55 UTC",
    reading: (
      <>
        “退款金额超过支付金额”检查读完了 <code>demo.payments</code>，返回 0 行：一张干净的底片。
      </>
    ),
    demo: "打开在线演示",
    github: "在 GitHub 上点星",
    note: "把同一个示例商店装进你自己的 PostgreSQL。",
  },
});
