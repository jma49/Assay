"use client";

import { useCallback, useEffect, useState } from "react";
import { AppWindow, Unplug } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { isMcpScope, type McpScope } from "@/lib/auth/mcp-scopes";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";

interface AppRow {
  id: string;
  clientId: string;
  name: string | null;
  scopes: McpScope[];
  createdAt: string | Date;
}

const COPY = {
  en: {
    title: "Connected apps",
    intro: "Apps that sign in with OAuth, such as Claude on the web, need only the MCP endpoint: they send you here to approve them.",
    none: "No apps connected.",
    unnamed: "Unnamed app",
    since: (when: string) => `Connected ${when}`,
    scopes: { "checks:read": "read checks", "history:read": "read history", "checks:run": "run checks" } satisfies Record<McpScope, string>,
    disconnect: "Disconnect",
    confirmTitle: "Disconnect this app?",
    confirmBody: (name: string) => `${name} loses access at once. It can ask you again later.`,
    cancel: "Cancel",
    done: "App disconnected",
    failed: "Something went wrong",
  },
  zh: {
    title: "已连接的应用",
    intro: "支持 OAuth 登录的应用（例如网页版 Claude）只需要 MCP 地址：它们会把你带到这里授权。",
    none: "还没有连接的应用。",
    unnamed: "未命名应用",
    since: (when: string) => `连接于${when}`,
    scopes: { "checks:read": "查看检查", "history:read": "查看历史", "checks:run": "执行检查" } satisfies Record<McpScope, string>,
    disconnect: "断开",
    confirmTitle: "断开这个应用？",
    confirmBody: (name: string) => `${name} 会立即失去访问权限，之后可以重新请求授权。`,
    cancel: "取消",
    done: "已断开应用",
    failed: "操作失败",
  },
};

/** The OAuth apps (MCP clients) the signed-in person has approved, with a way to disconnect each. */
export function ConnectedApps() {
  const { language } = useLanguage();
  const t = COPY[language];
  const [apps, setApps] = useState<AppRow[] | null>(null);
  const [disconnecting, setDisconnecting] = useState<AppRow | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await authClient.oauth2.getConsents();
    if (error) return toast.error(error.message ?? t.failed);
    const consents = (data ?? []) as { id: string; clientId: string; scopes?: string[]; createdAt: string | Date }[];
    const rows = await Promise.all(
      consents.map(async (consent) => {
        const { data: client } = await authClient.oauth2.publicClient({ query: { client_id: consent.clientId } });
        return { id: consent.id, clientId: consent.clientId, name: client?.client_name ?? null, scopes: (consent.scopes ?? []).filter(isMcpScope), createdAt: consent.createdAt };
      }),
    );
    setApps(rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
  }, [t.failed]);

  useEffect(() => void load(), [load]);

  const disconnect = async (app: AppRow) => {
    const { error } = await authClient.oauth2.deleteConsent({ id: app.id });
    if (error) return toast.error(error.message ?? t.failed);
    toast.success(t.done);
    void load();
  };

  return (
    <section className="space-y-3">
      <div className="max-w-2xl space-y-1">
        <h2 className="text-[17px] font-semibold">{t.title}</h2>
        <p className="text-[13px] leading-6 text-muted-foreground">{t.intro}</p>
      </div>
      <div className="overflow-hidden rounded-xl bg-card shadow-border">
        {apps === null ? (
          <div className="skeleton-shimmer h-16" />
        ) : apps.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">{t.none}</p>
        ) : (
          <ul className="divide-y">
            {apps.map((app) => (
              <li key={app.id} className="flex items-center gap-4 px-4 py-3.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <AppWindow className="size-4" />
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-[13.5px] font-medium">{app.name || t.unnamed}</span>
                  <div className="flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
                    <span title={formatDateTime(app.createdAt, language)}>{t.since(formatRelative(app.createdAt, language))}</span>
                    {app.scopes.length > 0 && <span>{app.scopes.map((scope) => t.scopes[scope]).join(" · ")}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setDisconnecting(app)}>
                  <Unplug />
                  {t.disconnect}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={disconnecting !== null} onOpenChange={(open) => !open && setDisconnecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmBody(disconnecting?.name || t.unnamed)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:brightness-110" onClick={() => disconnecting && void disconnect(disconnecting)}>
              {t.disconnect}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
