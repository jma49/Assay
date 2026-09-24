import type { ReactNode } from "react";
import type { DemoKind, Language } from "./content";

type Status = "passed" | "attention" | "failed";

const STATUS_COLOR: Record<Status, string> = {
  passed: "var(--l-success)",
  attention: "var(--l-attention)",
  failed: "var(--l-failure)",
};

const STATUS_LABEL: Record<Language, Record<Status, string>> = {
  en: { passed: "Passed", attention: "Needs attention", failed: "Failed" },
  zh: { passed: "通过", attention: "需要关注", failed: "失败" },
};

export function StatusDot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden
      className="inline-block size-1.5 shrink-0 rounded-full"
      style={{ background: STATUS_COLOR[status] }}
    />
  );
}

function StatusText({ status, lang }: { status: Status; lang: Language }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: STATUS_COLOR[status] }}>
      <StatusDot status={status} />
      {STATUS_LABEL[lang][status]}
    </span>
  );
}

/** Bordered frame with a title bar; fixed body height keeps tab switches from shifting layout. */
export function DemoFrame({
  title,
  meta,
  children,
  bodyClassName = "h-[300px] md:h-[340px]",
  chrome = false,
  elevated = false,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  /** macOS-style window buttons in the title bar. */
  chrome?: boolean;
  /** Lifted shadow for a window floating over a colored background. */
  elevated?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-(--l-line) bg-(--l-bg) ${
        elevated ? "shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]" : ""
      }`}
    >
      <div className="flex h-10 items-center justify-between gap-4 border-b border-(--l-line) bg-(--l-panel) px-4 text-[13px]">
        <span className="flex min-w-0 items-center gap-3">
          {chrome && (
            <span className="flex shrink-0 gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </span>
          )}
          <span className="truncate font-medium">{title}</span>
        </span>
        {meta && <span className="shrink-0 text-(--l-muted)">{meta}</span>}
      </div>
      <div className={`flex flex-col overflow-hidden ${bodyClassName}`}>{children}</div>
    </div>
  );
}

function Code({ lines }: { lines: string[] }) {
  return (
    <pre className="mono flex-1 overflow-hidden bg-(--l-code-bg) px-4 py-3 text-[13px] leading-6">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-4">
          <span className="w-4 shrink-0 text-right text-(--l-muted) select-none">{i + 1}</span>
          <span className="whitespace-pre">{line}</span>
        </div>
      ))}
    </pre>
  );
}

function Table({
  head,
  rows,
  alignRight = [],
}: {
  head: string[];
  rows: ReactNode[][];
  alignRight?: number[];
}) {
  const align = (i: number) => (alignRight.includes(i) ? "text-right" : "text-left");
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-(--l-line) text-(--l-muted)">
          {head.map((h, i) => (
            <th key={h} className={`px-4 py-2.5 font-normal ${align(i)}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-b border-(--l-line) last:border-0">
            {row.map((cell, i) => (
              <td key={i} className={`px-4 py-2.5 tabular-nums ${align(i)}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const MISSING_PAYMENT_SQL = [
  "SELECT o.id, o.customer_id, o.total",
  "FROM demo.orders o",
  "WHERE o.status IN ('paid', 'shipped')",
  "  AND NOT EXISTS (",
  "    SELECT 1 FROM demo.payments p",
  "    WHERE p.order_id = o.id",
  "  );",
];

function ValidatorDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  return (
    <DemoFrame title="paid-orders-missing-payment.sql" meta="PostgreSQL">
      <Code lines={MISSING_PAYMENT_SQL} />
      <div className="space-y-2 border-t border-(--l-line) px-4 py-3 text-[13px]">
        <div className="flex items-center justify-between gap-4">
          <StatusText status="passed" lang={lang} />
          <span className="text-(--l-muted)">{zh ? "只读查询，可以保存" : "Read-only, ready to save"}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="mono truncate text-(--l-muted) line-through">DELETE FROM demo.payments …</span>
          <span style={{ color: "var(--l-failure)" }} className="shrink-0">
            {zh ? "已拦截：禁止 DELETE" : "Blocked: DELETE is not allowed"}
          </span>
        </div>
      </div>
    </DemoFrame>
  );
}

function AiDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  return (
    <DemoFrame title={zh ? "AI 生成 SQL" : "Generate with AI"} meta="Gemini">
      <div className="border-b border-(--l-line) px-4 py-3 text-[14px]">
        <span className="text-(--l-muted)">{zh ? "描述：" : "Prompt: "}</span>
        {zh ? "找出已支付但没有支付记录的订单" : "Orders marked paid that have no payment record"}
      </div>
      <Code lines={MISSING_PAYMENT_SQL} />
    </DemoFrame>
  );
}

function VersionsDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  return (
    <DemoFrame title="demo-payment-amount-mismatch" meta={zh ? "3 个版本" : "3 versions"}>
      <Table
        head={[zh ? "版本" : "Version", zh ? "作者" : "Author", zh ? "说明" : "Note", ""]}
        alignRight={[3]}
        rows={[
          ["v3", "jincheng", zh ? "改为按订单汇总" : "Group by order", <span key="c" className="text-(--l-muted)">{zh ? "当前" : "Current"}</span>],
          ["v2", "alex", zh ? "忽略已退款" : "Ignore refunds", <span key="r" className="underline underline-offset-4">{zh ? "回滚" : "Roll back"}</span>],
          ["v1", "alex", zh ? "初始版本" : "Initial version", <span key="r" className="underline underline-offset-4">{zh ? "回滚" : "Roll back"}</span>],
        ]}
      />
    </DemoFrame>
  );
}

function ScheduleDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  return (
    <DemoFrame title={zh ? "定时任务" : "Scheduled checks"} meta={zh ? "5 个启用" : "5 enabled"}>
      <Table
        head={[zh ? "脚本" : "Script", "Cron", zh ? "下次运行" : "Next run"]}
        alignRight={[2]}
        rows={[
          [zh ? "库存为负" : "Negative inventory", <span key="c" className="mono">*/30 * * * *</span>, "14:30"],
          [zh ? "重复下单" : "Duplicate orders", <span key="c" className="mono">0 * * * *</span>, "15:00"],
          [zh ? "未来时间的订单" : "Future-dated orders", <span key="c" className="mono">0 0 * * *</span>, zh ? "明天 00:00" : "Tomorrow 00:00"],
          [zh ? "已支付缺支付记录" : "Paid, no payment", <span key="c" className="mono">0 9 * * *</span>, zh ? "明天 09:00" : "Tomorrow 09:00"],
          [zh ? "超期待支付订单" : "Stale pending orders", <span key="c" className="mono">0 8 * * 1</span>, zh ? "周一 08:00" : "Mon 08:00"],
        ]}
      />
    </DemoFrame>
  );
}

export const RECENT_RUNS: { en: string; zh: string; status: Status; found: number }[] = [
  { en: "Duplicate orders", zh: "重复下单", status: "attention", found: 6 },
  { en: "Negative inventory", zh: "库存为负", status: "attention", found: 3 },
  { en: "Refunds larger than payment", zh: "退款超过支付金额", status: "passed", found: 0 },
  { en: "Stale pending orders", zh: "超期待支付订单", status: "attention", found: 7 },
  { en: "Shipping status check", zh: "物流状态检查", status: "failed", found: 0 },
  { en: "Future-dated orders", zh: "未来时间的订单", status: "passed", found: 0 },
];

function StatusesDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  return (
    <DemoFrame title={zh ? "执行历史" : "Run history"} meta={zh ? "今天" : "Today"}>
      <Table
        head={[zh ? "脚本" : "Script", zh ? "状态" : "Status", zh ? "发现" : "Found"]}
        alignRight={[2]}
        rows={RECENT_RUNS.map((r) => [
          r[lang],
          <StatusText key="s" status={r.status} lang={lang} />,
          r.status === "failed" ? "—" : r.found,
        ])}
      />
    </DemoFrame>
  );
}

const PASS_RATES = [92, 88, 95, 71, 84, 90, 97];

function TrendsDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  const days = zh ? ["一", "二", "三", "四", "五", "六", "日"] : ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <DemoFrame title={zh ? "通过率" : "Pass rate"} meta={zh ? "近 7 天" : "Last 7 days"}>
      <div className="flex h-full flex-col px-4 pt-6 pb-4">
        <div className="grid flex-1 grid-cols-7 items-end gap-3 border-b border-(--l-line)">
          {PASS_RATES.map((rate, i) => (
            <div key={i} className="flex h-full flex-col justify-end gap-1.5 text-center">
              <span className="text-[12px] text-(--l-muted) tabular-nums">{rate}%</span>
              <div
                className="mx-auto w-6 rounded-t-sm"
                style={{
                  height: `${rate * 0.8}%`,
                  background: rate < 80 ? "var(--l-attention)" : "var(--l-fg)",
                  opacity: rate < 80 ? 0.9 : 0.35,
                }}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-3 pt-2 text-center text-[12px] text-(--l-muted)">
          {days.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      </div>
    </DemoFrame>
  );
}

function ApprovalsDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  const pending = <span key="p" style={{ color: "var(--l-attention)" }}>{zh ? "待审批" : "Pending"}</span>;
  const approved = <span key="a" style={{ color: "var(--l-success)" }}>{zh ? "已通过" : "Approved"}</span>;
  return (
    <DemoFrame title={zh ? "审批" : "Approvals"} meta={zh ? "2 个待处理" : "2 pending"}>
      <Table
        head={[zh ? "变更" : "Change", zh ? "申请人" : "Requested by", zh ? "状态" : "Status"]}
        alignRight={[2]}
        rows={[
          [zh ? "新建：退款超过支付金额" : "Create: Refunds larger than payment", "alex", pending],
          [zh ? "修改：重复下单" : "Update: Duplicate orders", "sam", pending],
          [zh ? "修改：库存为负" : "Update: Negative inventory", "riley", approved],
          [zh ? "新建：未来时间的订单" : "Create: Future-dated orders", "casey", approved],
        ]}
      />
    </DemoFrame>
  );
}

function RolesDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  const yes = <span key="y">✓</span>;
  const no = <span key="n" className="text-(--l-muted)">—</span>;
  return (
    <DemoFrame title={zh ? "角色与权限" : "Roles and permissions"}>
      <Table
        head={[zh ? "角色" : "Role", zh ? "查看" : "View", zh ? "执行" : "Run", zh ? "编写" : "Write", zh ? "审批" : "Approve"]}
        alignRight={[1, 2, 3, 4]}
        rows={[
          [zh ? "管理员" : "Admin", yes, yes, yes, yes],
          [zh ? "经理" : "Manager", yes, yes, yes, yes],
          [zh ? "开发者" : "Developer", yes, yes, yes, no],
          [zh ? "查看者" : "Viewer", yes, no, no, no],
        ]}
      />
    </DemoFrame>
  );
}

function AuditDemo({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  return (
    <DemoFrame title={zh ? "编辑历史" : "Edit history"} meta="demo-duplicate-orders">
      <div className="border-b border-(--l-line) px-4 py-3 text-[13px] text-(--l-muted)">
        sam · {zh ? "2 小时前" : "2 hours ago"} · {zh ? "修改 SQL" : "Updated SQL"}
      </div>
      <pre className="mono flex-1 overflow-x-auto bg-(--l-code-bg) px-4 py-3 text-[13px] leading-6">
        <div className="text-(--l-muted)">  JOIN demo.orders b</div>
        <div className="text-(--l-muted)">    ON b.customer_id = a.customer_id</div>
        <div style={{ color: "var(--l-failure)" }}>-  AND b.created_at &lt; a.created_at + interval &apos;1 hour&apos;</div>
        <div style={{ color: "var(--l-success)" }}>+  AND b.total = a.total</div>
        <div style={{ color: "var(--l-success)" }}>+  AND b.created_at BETWEEN a.created_at</div>
        <div style={{ color: "var(--l-success)" }}>+      AND a.created_at + interval &apos;5 minutes&apos;</div>
      </pre>
    </DemoFrame>
  );
}

const DEMOS: Record<DemoKind, (props: { lang: Language }) => ReactNode> = {
  validator: ValidatorDemo,
  ai: AiDemo,
  versions: VersionsDemo,
  schedule: ScheduleDemo,
  statuses: StatusesDemo,
  trends: TrendsDemo,
  approvals: ApprovalsDemo,
  roles: RolesDemo,
  audit: AuditDemo,
};

export function Demo({ kind, lang }: { kind: DemoKind; lang: Language }) {
  const Component = DEMOS[kind];
  return <Component lang={lang} />;
}
