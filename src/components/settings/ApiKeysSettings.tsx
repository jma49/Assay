"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowStatusBar } from "@/components/layout/WindowChrome";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { ConnectedApps } from "./ConnectedApps";
import { useMe } from "@/lib/auth/use-me";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";

interface KeyRow {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date;
  expiresAt: string | Date | null;
  lastRequest: string | Date | null;
}

const EXPIRY_DAYS = [30, 90, 365] as const;

const COPY = {
  en: {
    title: "API keys",
    intro: "Personal keys let agents such as Claude Code or Cursor use Assay through its MCP server. A key can do what your role can do, and no more; if your role changes, so do your keys.",
    create: "New key",
    name: "Name",
    namePlaceholder: "Claude Code on my laptop",
    expires: "Expires after",
    days: (n: number) => (n === 365 ? "1 year" : `${n} days`),
    cancel: "Cancel",
    creating: "Creating…",
    createdTitle: "Copy your key now",
    createdBody: "It is shown only once. Assay keeps a hash, not the key.",
    connect: "Connect an agent",
    claudeCode: "Claude Code",
    other: "Other MCP clients (Cursor, Windsurf, …)",
    done: "Done",
    copy: "Copy",
    copied: "Copied",
    none: "No keys yet.",
    lastUsed: (when: string) => `Last used ${when}`,
    neverUsed: "Never used",
    expiresOn: (when: string) => `Expires ${when}`,
    expired: "Expired",
    noExpiry: "No expiry",
    revoke: "Revoke",
    revokeTitle: "Revoke this key?",
    revokeBody: (name: string) => `Agents using “${name}” lose access at once.`,
    revoked: "Key revoked",
    failed: "Something went wrong",
    count: (n: number) => (n === 1 ? "1 key" : `${n} keys`),
    endpoint: "MCP endpoint",
    guest: "Sign up to create API keys.",
  },
  zh: {
    title: "API 密钥",
    intro: "个人密钥让 Claude Code、Cursor 等 AI 代理通过 MCP 服务使用 Assay。密钥的权限与你的角色相同，不会更多；角色变化时，密钥的权限也随之变化。",
    create: "新建密钥",
    name: "名称",
    namePlaceholder: "我笔记本上的 Claude Code",
    expires: "有效期",
    days: (n: number) => (n === 365 ? "1 年" : `${n} 天`),
    cancel: "取消",
    creating: "创建中…",
    createdTitle: "现在复制你的密钥",
    createdBody: "密钥只显示这一次，Assay 只保存它的哈希值。",
    connect: "连接 AI 代理",
    claudeCode: "Claude Code",
    other: "其他 MCP 客户端（Cursor、Windsurf 等）",
    done: "完成",
    copy: "复制",
    copied: "已复制",
    none: "还没有密钥。",
    lastUsed: (when: string) => `最近使用：${when}`,
    neverUsed: "尚未使用",
    expiresOn: (when: string) => `${when}过期`,
    expired: "已过期",
    noExpiry: "永不过期",
    revoke: "吊销",
    revokeTitle: "吊销这个密钥？",
    revokeBody: (name: string) => `使用「${name}」的代理会立即失去访问权限。`,
    revoked: "密钥已吊销",
    failed: "操作失败",
    count: (n: number) => `${n} 个密钥`,
    endpoint: "MCP 地址",
    guest: "注册后可以创建 API 密钥。",
  },
};

function CopyBlock({ text, label }: { text: string; label?: string }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid min-w-0 gap-1.5">
      {label && <span className="text-[12px] font-medium text-muted-foreground">{label}</span>}
      <div className="flex min-w-0 items-start gap-2">
        <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-code px-3 py-2 font-mono text-[12px] leading-5 whitespace-pre">{text}</pre>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? <Check /> : <Copy />}
          {copied ? t.copied : t.copy}
        </Button>
      </div>
    </div>
  );
}

/** How to point common agents at this server with a key. */
function ConnectSnippets({ apiKey, endpoint }: { apiKey: string; endpoint: string }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const claude = `claude mcp add --transport http assay ${endpoint} \\\n  --header "Authorization: Bearer ${apiKey}"`;
  const json = JSON.stringify({ mcpServers: { assay: { url: endpoint, headers: { Authorization: `Bearer ${apiKey}` } } } }, null, 2);
  return (
    <div className="grid min-w-0 gap-3">
      <p className="text-[13px] font-medium">{t.connect}</p>
      <CopyBlock label={t.claudeCode} text={claude} />
      <CopyBlock label={t.other} text={json} />
    </div>
  );
}

/** Settings → API keys: personal keys for the MCP server. */
export function ApiKeysSettings() {
  const { language } = useLanguage();
  const t = COPY[language];
  const me = useMe();
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState<number>(90);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<KeyRow | null>(null);
  // The full URL is only known in the browser; reading it after mount keeps server and client HTML the same.
  const [endpoint, setEndpoint] = useState("/api/mcp");
  useEffect(() => setEndpoint(`${window.location.origin}/api/mcp`), []);

  const load = useCallback(async () => {
    const { data, error } = await authClient.apiKey.list();
    if (error) return toast.error(error.message ?? t.failed);
    setKeys(((data as { apiKeys?: KeyRow[] })?.apiKeys ?? []).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
  }, [t.failed]);

  useEffect(() => {
    if (me && !me.guest) void load();
  }, [me, load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await authClient.apiKey.create({ name: name.trim(), expiresIn: days * 24 * 60 * 60 });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? t.failed);
    setCreated((data as { key: string }).key);
    setName("");
    void load();
  };

  const revoke = async (key: KeyRow) => {
    const { error } = await authClient.apiKey.delete({ keyId: key.id });
    if (error) return toast.error(error.message ?? t.failed);
    toast.success(t.revoked);
    void load();
  };

  if (me?.guest) {
    return (
      <div className={`${APP_CONTAINER} py-6`}>
        <p className="rounded-xl bg-muted p-4 text-[13px] text-muted-foreground">{t.guest}</p>
      </div>
    );
  }

  return (
    <div className={`${APP_CONTAINER} space-y-8 py-6`}>
      {keys && <WindowStatusBar>{t.count(keys.length)}</WindowStatusBar>}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-1.5">
          <h1 className="text-[28px] leading-tight font-bold">{t.title}</h1>
          <p className="text-[13.5px] leading-6 text-muted-foreground">{t.intro}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {t.endpoint}: <code className="rounded bg-code px-1.5 py-0.5 font-mono text-[12px] text-foreground">{endpoint}</code>
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          {t.create}
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl bg-card shadow-border">
        {keys === null ? (
          <div className="skeleton-shimmer h-24" />
        ) : keys.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{t.none}</p>
        ) : (
          <ul className="divide-y">
            {keys.map((key) => {
              const expired = key.expiresAt && new Date(key.expiresAt) < new Date();
              return (
                <li key={key.id} className="flex items-center gap-4 px-4 py-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <KeyRound className="size-4" />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate text-[13.5px] font-medium">{key.name || "—"}</span>
                      {key.start && <span className="font-mono text-[12px] text-muted-foreground">{key.start}…</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
                      <span title={key.lastRequest ? formatDateTime(key.lastRequest, language) : undefined}>
                        {key.lastRequest ? t.lastUsed(formatRelative(key.lastRequest, language)) : t.neverUsed}
                      </span>
                      <span className={expired ? "text-failure" : undefined}>
                        {expired ? t.expired : key.expiresAt ? t.expiresOn(formatDateTime(key.expiresAt, language)) : t.noExpiry}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setRevoking(key)}>
                    <Trash2 />
                    {t.revoke}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConnectedApps />

      <Dialog open={creating} onOpenChange={(open) => { setCreating(open); if (!open) setCreated(null); }}>
        <DialogContent className="sm:max-w-xl">
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle>{t.createdTitle}</DialogTitle>
                <DialogDescription>{t.createdBody}</DialogDescription>
              </DialogHeader>
              <CopyBlock text={created} />
              <ConnectSnippets apiKey={created} endpoint={endpoint} />
              <DialogFooter>
                <Button onClick={() => { setCreating(false); setCreated(null); }}>{t.done}</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={create} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>{t.create}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="key-name">{t.name}</Label>
                <Input id="key-name" required maxLength={60} autoFocus placeholder={t.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium">{t.expires}</span>
                <div className="inline-flex w-fit rounded-md bg-muted p-0.5" role="radiogroup" aria-label={t.expires}>
                  {EXPIRY_DAYS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={days === n}
                      onClick={() => setDays(n)}
                      className={`h-7 rounded-[5px] px-3 text-[12.5px] font-medium transition-[background-color,color] duration-150 ${days === n ? "bg-card text-foreground shadow-border" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t.days(n)}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                  {t.cancel}
                </Button>
                <Button type="submit" disabled={busy || !name.trim()}>
                  {busy && <Loader2 className="animate-spin" />}
                  {busy ? t.creating : t.create}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.revokeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.revokeBody(revoking?.name || "—")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:brightness-110" onClick={() => revoking && void revoke(revoking)}>
              {t.revoke}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
