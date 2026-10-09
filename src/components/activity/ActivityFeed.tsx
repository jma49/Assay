"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BellOff, BellRing, CheckCircle2, Clock, Hand, XCircle } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowToolbar } from "@/components/layout/WindowChrome";
import { ChannelIcon } from "@/components/notifications/channels";
import { OUTCOME_DOT, OUTCOME_LABEL } from "@/components/checks/status";
import { apiErrorCodeText } from "@/client/api-errors";
import { useApi } from "@/client/use-api";
import type { ActivityDelivery, ActivityItem, ActivityPage } from "@/contracts/activity";
import { addPage, type FeedPage } from "./pages";
import type { AlertKind } from "@/domain/notify";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";

type Filter = "all" | "broken" | "issues" | "recovered";

/** "Issues" covers both a check starting to return rows and more rows appearing. */
const FILTER_KINDS: Record<Filter, AlertKind[]> = {
  all: [],
  broken: ["broken"],
  issues: ["issues", "new_rows"],
  recovered: ["recovered"],
};

const COPY = {
  en: {
    filters: { all: "All", broken: "Broken", issues: "Issues", recovered: "Recovered" } as Record<Filter, string>,
    broken: "broke",
    issues: (n: number) => `found ${n === 1 ? "1 row" : `${n} rows`}`,
    newRows: (n: number) => `has ${n} new ${n === 1 ? "row" : "rows"}`,
    recovered: "is clean again",
    was: (from: string) => `was ${from}`,
    total: (n: number) => `${n} total`,
    fixed: (n: number) => `${n} fixed`,
    run: "Run",
    today: "Today",
    yesterday: "Yesterday",
    empty: "Nothing has changed yet. Events appear here when a check's outcome changes or new rows show up.",
    emptyFiltered: "No events of this kind.",
    setUp: "Send these to Slack, Telegram or Feishu",
    more: "Show older",
    loading: "Loading…",
    loadFailed: "Could not load activity",
    delivery: { sent: "Delivered", failed: "Failed", pending: "Sending" } as Record<ActivityDelivery["status"], string>,
    suppressed: { muted: "Muted, not sent", acknowledged: "Acknowledged, not sent" },
  },
  zh: {
    filters: { all: "全部", broken: "出错", issues: "有问题", recovered: "恢复" } as Record<Filter, string>,
    broken: "执行出错",
    issues: (n: number) => `发现 ${n} 行问题数据`,
    newRows: (n: number) => `新增 ${n} 行问题数据`,
    recovered: "已恢复正常",
    was: (from: string) => `之前${from}`,
    total: (n: number) => `共 ${n} 行`,
    fixed: (n: number) => `已修复 ${n} 行`,
    run: "执行结果",
    today: "今天",
    yesterday: "昨天",
    empty: "还没有任何变化。检查的结果状态变化或出现新问题数据时，会记录在这里。",
    emptyFiltered: "没有这类事件。",
    setUp: "把这些推送到 Slack、Telegram 或飞书",
    more: "查看更早",
    loading: "加载中…",
    loadFailed: "无法加载动态",
    delivery: { sent: "已送达", failed: "发送失败", pending: "发送中" } as Record<ActivityDelivery["status"], string>,
    suppressed: { muted: "已静音，未发送", acknowledged: "已确认，未发送" },
  },
};

const DELIVERY_ICON = { sent: CheckCircle2, failed: XCircle, pending: Clock };
const DELIVERY_COLOR = { sent: "text-success", failed: "text-failure", pending: "text-muted-foreground" };

function dayLabel(iso: string, language: "en" | "zh"): string {
  const date = new Date(iso);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (days === 0) return COPY[language].today;
  if (days === 1) return COPY[language].yesterday;
  return formatDate(date, language, { weekday: "short", month: "short", day: "numeric" });
}

function Headline({ item }: { item: ActivityItem }) {
  const { language } = useLanguage();
  const t = COPY[language];
  if (item.kind === "broken") return <>{t.broken}</>;
  if (item.kind === "recovered") return <>{t.recovered}</>;
  if (item.kind === "new_rows") return <>{t.newRows(item.diff?.added ?? item.rowCount)}</>;
  return <>{t.issues(item.rowCount)}</>;
}

function Row({ item }: { item: ActivityItem }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const name = language === "zh" ? item.cnName || item.checkName : item.checkName;
  const details = [
    item.from && item.from !== item.to ? t.was(OUTCOME_LABEL[item.from][language]) : null,
    item.kind === "new_rows" ? t.total(item.rowCount) : null,
    item.diff && item.diff.fixed > 0 ? t.fixed(item.diff.fixed) : null,
  ].filter(Boolean);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={cn("status-dot mt-[7px]", OUTCOME_DOT[item.to])} aria-label={OUTCOME_LABEL[item.to][language]} />
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="text-body-md leading-5">
          <Link href={`/checks/${encodeURIComponent(item.checkId)}`} className="font-medium hover:underline">
            {name}
          </Link>{" "}
          <span className={cn(item.kind === "broken" ? "text-failure" : item.kind === "recovered" ? "text-success" : "text-foreground")}>
            <Headline item={item} />
          </span>
        </p>
        {item.kind === "broken" && item.error && (
          <p className="truncate font-mono text-caption text-muted-foreground" title={item.error}>
            {item.error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
          <time dateTime={item.at} title={formatDateTime(item.at, language)} className="tabular-nums">
            {formatTime(item.at, language)}
          </time>
          {details.map((detail) => (
            <span key={detail} className="before:mr-2 before:content-['·']">
              {detail}
            </span>
          ))}
          <Link href={`/runs/${item.runId}`} className="text-primary before:mr-2 before:text-muted-foreground before:content-['·'] hover:underline">
            {t.run}
          </Link>
        </div>
      </div>
      {item.suppressed && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-caption text-muted-foreground max-sm:hidden">
          {item.suppressed === "muted" ? <BellOff className="size-3" /> : <Hand className="size-3" />}
          {t.suppressed[item.suppressed]}
        </span>
      )}
      {item.deliveries.length > 0 && (
        <ul className="flex shrink-0 flex-wrap justify-end gap-1.5 max-sm:hidden">
          {item.deliveries.map((delivery, i) => {
            const Icon = DELIVERY_ICON[delivery.status];
            return (
              <li
                key={i}
                title={`${delivery.destination}: ${t.delivery[delivery.status]}`}
                className="inline-flex items-center gap-1 rounded-md py-0.5 pr-1.5 pl-0.5 text-caption shadow-border"
              >
                <ChannelIcon kind={delivery.kind} className="size-5 rounded-none [&_svg]:size-3" />
                <Icon className={cn("size-3.5", DELIVERY_COLOR[delivery.status])} />
                <span className="sr-only">
                  {delivery.destination}: {t.delivery[delivery.status]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/** What changed across all checks, newest first, and where each alert went. */
export function ActivityFeed() {
  const { language } = useLanguage();
  const t = COPY[language];
  const [filter, setFilter] = useState<Filter>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<FeedPage[]>([]);
  const query = FILTER_KINDS[filter].join(",");
  const url = `/api/activity?${new URLSearchParams({ ...(query && { kind: query }), ...(cursor && { cursor }) })}`;
  const { data, dataUrl, error, errorCode, loading } = useApi<ActivityPage>(url);

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setCursor(null);
    setPages([]);
  };

  // Each response for the current URL is added once, while rendering (data
  // still showing from the previous URL is ignored).
  const [added, setAdded] = useState<ActivityPage | null>(null);
  if (data && dataUrl === url && added !== data) {
    setAdded(data);
    setPages((previous) => addPage(previous, cursor, data.items));
  }

  const items = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const groups = useMemo(() => {
    const byDay = new Map<string, ActivityItem[]>();
    for (const item of items) {
      const label = dayLabel(item.at, language);
      byDay.set(label, [...(byDay.get(label) ?? []), item]);
    }
    return [...byDay.entries()];
  }, [items, language]);

  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`}>
      <WindowToolbar>
        <div className="inline-flex rounded-none bg-muted p-1" role="tablist" aria-label="Filter">
          {(Object.keys(FILTER_KINDS) as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => changeFilter(key)}
              className={cn(
                "h-8 rounded-none px-3.5 text-body-sm font-medium transition-[background-color,color] duration-150",
                filter === key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.filters[key]}
            </button>
          ))}
        </div>
      </WindowToolbar>

      {error && !data ? (
        <p className="rounded-xl bg-failure-soft p-4 text-body-sm text-failure">
          {t.loadFailed}: {apiErrorCodeText(errorCode, language) ?? error}
        </p>
      ) : loading && items.length === 0 ? (
        <div className="space-y-3">
          <div className="skeleton-shimmer h-40 rounded-xl" />
          <div className="skeleton-shimmer h-40 rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card px-6 py-14 text-center shadow-border">
          <span className="grid size-10 place-items-center rounded-none bg-muted text-muted-foreground">
            <BellRing className="size-5" />
          </span>
          <p className="max-w-md text-body-md text-muted-foreground">{filter === "all" ? t.empty : t.emptyFiltered}</p>
          <Link href="/settings/notifications" className="text-body-sm font-medium text-primary hover:underline">
            {t.setUp}
          </Link>
        </div>
      ) : (
        <>
          {groups.map(([day, dayItems]) => (
            <section key={day} className="space-y-2">
              <h2 className="px-1 text-label-caps uppercase text-muted-foreground">{day}</h2>
              <ul className="divide-y overflow-hidden rounded-xl bg-card shadow-border">
                {dayItems.map((item) => (
                  <Row key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
          {data?.nextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => setCursor(data.nextCursor)}
                className="h-8 rounded-md px-3 text-body-sm font-medium text-primary hover:bg-muted disabled:opacity-50"
              >
                {loading ? t.loading : t.more}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
