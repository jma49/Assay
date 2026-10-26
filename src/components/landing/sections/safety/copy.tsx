import { defineCopy } from "../../lib/i18n";

/** One read-only layer: its printed name (engraved in the bake; shown in Chinese), an optional run-in, the note. */
interface Layer {
  k: string;
  q?: string;
  p: string;
}

/**
 * Sources (src/server): read-only-validator.ts:24-93, 220-221; db.ts:106-111; run-check-deps.ts:18-35;
 * test-connection.ts:34-49; secret-box.ts; safe-url.ts:10-33; triage.ts:20-44.
 * The DELETE draft is a composed example ("Example"); the refusal is the app's real message, in Chinese as the app shows it.
 */
export const safetyCopy = defineCopy({
  en: {
    title: (
      <>
        Reading never
        <br />
        changes the part.
      </>
    ),
    lede: "Radiography tests a weld without touching it. A check reads your database the same way: SQL that could write is refused, and the run is read-only all the way down.",
    draft: "Check draft · Example",
    refused: "Validator · refused on save",
    msg: '"DELETE" is not allowed. Checks can only read data.',
    layers: [
      { k: "Validator: ", q: "On save and before every run.", p: "Only SELECT, WITH, EXPLAIN or DO. 32 keywords and 23 functions with side effects are refused." },
      { k: "BEGIN READ ONLY: ", p: "Every run is one read-only transaction. Each statement runs alone, so a second one cannot ride along." },
      { k: "Statement timeout: ", p: "PostgreSQL stops a check that runs too long: 30 s by default, 1 to 255 s. A stopped check is Broken." },
      { k: "SELECT-only role: ", q: "Recommended.", p: "Connect as a role that can only read. Test connection warns you when the role could write." },
    ] as Layer[],
    figcap: "A check draft with DELETE FROM demo.payments is refused by the validator before it can be saved. Behind it, four layers; the last is recommended.",
    markers: [
      {
        h: "Secrets sealed",
        p: "Connection strings and channel secrets are encrypted at rest (AES-256-GCM), never returned by the API and never logged.",
      },
      { h: "Private hosts refused", p: "Data sources on private, loopback or link-local addresses are refused unless you allow them." },
      {
        h: "AI never gets the row values",
        p: "Triage runs only when you ask. It gets the SQL, the schema and a column profile, never the rows a check returns. An error message or a literal in your SQL can still quote a value.",
      },
    ],
  },
  zh: {
    title: (
      <>
        只读，
        <br />
        不碰数据。
      </>
    ),
    lede: "射线探伤检查焊缝，从不碰它一下。assay 读你的数据库也是这样：可能写入的 SQL 会被拒绝，运行从头到尾都是只读的。",
    draft: "检查草稿 · 示例",
    refused: "校验器 · 保存时拒绝",
    msg: '禁止使用关键词 "DELETE"。系统仅允许查询操作（SELECT）。',
    layers: [
      { k: "校验器", q: "保存时和每次运行前。", p: "只允许 SELECT、WITH、EXPLAIN 或 DO。32 个关键词和 23 个有副作用的函数一律拒绝。" },
      { k: "只读事务", p: "每次运行都在一个只读事务里。每条语句单独执行，夹带的第二条语句混不进去。" },
      { k: "语句超时 30 秒", p: "运行太久的检查由 PostgreSQL 直接停止：默认 30 秒，可设 1 到 255 秒。被停止的检查记为出错。" },
      { k: "只读角色", q: "建议使用。", p: "用只能读的数据库角色连接。角色有写权限时，“测试连接”会提醒你。" },
    ],
    figcap: "一个含 DELETE FROM demo.payments 的检查草稿在保存前就被校验器拒绝。它后面是四层保护，最后一层是建议项。",
    markers: [
      { h: "密钥加密保存", p: "连接串和通知渠道的密钥加密存储（AES-256-GCM），接口从不返回，日志从不记录。" },
      { h: "拒绝内网地址", p: "指向内网、回环或链路本地地址的数据源一律拒绝，除非你明确允许。" },
      {
        h: "AI 拿不到行的值",
        p: "只有你点了才会分析。AI 拿到的是 SQL、表结构和列的统计概况，从来不是检查返回的行。不过错误信息或 SQL 里的字面量仍可能带出某个值。",
      },
    ],
  },
});

/** The composed draft (the same in both languages: SQL is never translated). */
export const DRAFT = {
  table: "demo.payments",
  sql: "DELETE FROM demo.payments WHERE amount = 0;",
  keyword: "DELETE",
  rest: " FROM demo.payments\nWHERE amount = 0;",
} as const;
