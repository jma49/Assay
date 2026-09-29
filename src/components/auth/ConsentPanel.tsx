"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { authClient } from "@/lib/auth/client";
import { isMcpScope, type McpScope } from "@/lib/auth/mcp-scopes";

const COPY = {
  en: {
    title: (client: string) => `Allow ${client} to use Assay?`,
    unverifiedTitle: (client: string) => `Allow “${client}” (unverified) to use Assay?`,
    unknownClient: "An app",
    unverified: "Unverified app",
    unverifiedBody: "This app registered itself and chose its own name; Assay has not checked who made it. Allow it only if you just started connecting it and you trust the host your access goes to.",
    description: "It will act as you through Assay's MCP server.",
    signedInAs: "Signed in as",
    sendsTo: "Access goes to",
    publishedBy: "App published by",
    scopes: {
      "checks:read": { title: "Read checks", body: "Checks, their status, SQL and latest problem rows." },
      "history:read": { title: "Read run history", body: "Past runs and the activity feed." },
      "checks:run": { title: "Run checks and handle alerts", body: "Run a check now, acknowledge or mute its alerts." },
    } satisfies Record<McpScope, { title: string; body: string }>,
    identity: "Your name and email",
    offline: "Stay connected until you revoke it",
    roleNote: (role: string) => `It can never do more than your role (${role}) allows.`,
    notInRole: "Your role cannot do this.",
    allow: "Allow",
    deny: "Deny",
    nothing: "Choose at least one permission, or deny.",
    failed: "Could not save your answer. Start again from the app.",
  },
  zh: {
    title: (client: string) => `允许 ${client} 使用 Assay？`,
    unverifiedTitle: (client: string) => `允许“${client}”（未验证）使用 Assay？`,
    unknownClient: "一个应用",
    unverified: "未验证的应用",
    unverifiedBody: "这个应用是自行注册的，名字也是它自己填的，Assay 无法确认它的来源。只有在你刚刚主动连接它、并且信任下面接收授权的主机时才允许。",
    description: "它会通过 Assay 的 MCP 服务以你的身份操作。",
    signedInAs: "当前账号",
    sendsTo: "授权发送到",
    publishedBy: "应用发布方",
    scopes: {
      "checks:read": { title: "查看检查", body: "检查、状态、SQL 和最新的问题行。" },
      "history:read": { title: "查看执行历史", body: "过去的执行记录和动态。" },
      "checks:run": { title: "执行检查、处理告警", body: "立即执行检查，确认或静音告警。" },
    } satisfies Record<McpScope, { title: string; body: string }>,
    identity: "你的名字和邮箱",
    offline: "保持连接，直到你撤销",
    roleNote: (role: string) => `它的权限永远不会超过你的角色（${role}）。`,
    notInRole: "你的角色没有这项权限。",
    allow: "允许",
    deny: "拒绝",
    nothing: "至少选择一项权限，或者拒绝。",
    failed: "无法保存你的选择，请从应用里重新开始。",
  },
};

const IDENTITY_SCOPES = new Set(["openid", "profile", "email"]);

export function ConsentPanel({ clientName, clientHost, redirectHost, scopes, email, role, usable }: {
  clientName: string | null;
  /** For a client that names itself with a metadata URL: that URL's host, which the name cannot fake. */
  clientHost: string | null;
  redirectHost: string | null;
  scopes: string[];
  email: string;
  role: string;
  /** The MCP scopes the person's role can use; others are shown but cannot be granted. */
  usable: McpScope[];
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const mcpScopes = scopes.filter(isMcpScope);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(mcpScopes.filter((s) => usable.includes(s))));
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [failed, setFailed] = useState(false);

  const answer = async (accept: boolean) => {
    setBusy(accept ? "allow" : "deny");
    setFailed(false);
    // Unticked MCP scopes are left out; identity and refresh scopes go through as asked.
    const scope = scopes.filter((s) => !isMcpScope(s) || chosen.has(s)).join(" ");
    const { data, error } = await authClient.oauth2.consent({ accept, ...(scopes.length > 0 && { scope }) });
    const url = (data as { url?: string } | null)?.url;
    if (error || !url) {
      setFailed(true);
      setBusy(null);
      return;
    }
    window.location.assign(url);
  };

  const toggle = (scope: McpScope, on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      if (on) next.add(scope);
      else next.delete(scope);
      return next;
    });

  const nothingChosen = mcpScopes.length > 0 && chosen.size === 0;
  // Only a metadata-document client proves where it comes from (its host);
  // a dynamically registered one names itself, so its name proves nothing.
  const unverified = !clientHost;
  const title = unverified && clientName ? t.unverifiedTitle(clientName) : t.title(clientName ?? t.unknownClient);

  return (
    <AuthShell title={title} description={t.description}>
      <div className="grid w-full gap-4 text-[13px]">
        {unverified && (
          <div role="note" className="grid gap-1 rounded-lg bg-attention-soft px-3 py-2.5 text-attention">
            <p className="font-semibold">{t.unverified}</p>
            <p>{t.unverifiedBody}</p>
          </div>
        )}

        {redirectHost && (
          <div className="grid gap-0.5 rounded-lg border border-border-strong px-3 py-2.5">
            <span className="text-muted-foreground">{t.sendsTo}</span>
            <span className="break-all font-mono font-semibold text-foreground">{redirectHost}</span>
          </div>
        )}

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg bg-muted px-3 py-2.5">
          <dt className="text-muted-foreground">{t.signedInAs}</dt>
          <dd className="truncate font-medium">{email}</dd>
          {clientHost && (
            <>
              <dt className="text-muted-foreground">{t.publishedBy}</dt>
              <dd className="truncate font-mono text-[12px]">{clientHost}</dd>
            </>
          )}
        </dl>

        <ul className="grid gap-2.5">
          {mcpScopes.map((scope) => {
            const allowed = usable.includes(scope);
            return (
              <li key={scope}>
                <label className={allowed ? "flex cursor-pointer gap-3" : "flex gap-3 opacity-55"}>
                  <Checkbox className="mt-0.5" disabled={!allowed} checked={chosen.has(scope)} onCheckedChange={(on) => toggle(scope, on === true)} />
                  <span className="grid gap-0.5">
                    <span className="font-medium">{t.scopes[scope].title}</span>
                    <span className="text-muted-foreground">{allowed ? t.scopes[scope].body : t.notInRole}</span>
                  </span>
                </label>
              </li>
            );
          })}
          {scopes.some((s) => IDENTITY_SCOPES.has(s)) && <li className="pl-7 text-muted-foreground">{t.identity}</li>}
          {scopes.includes("offline_access") && <li className="pl-7 text-muted-foreground">{t.offline}</li>}
        </ul>

        <p className="text-[12px] text-muted-foreground">{t.roleNote(role)}</p>

        {(failed || nothingChosen) && (
          <p role="alert" className="rounded-lg bg-failure-soft px-3 py-2.5 text-failure">
            {failed ? t.failed : t.nothing}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={busy !== null} onClick={() => answer(false)}>
            {busy === "deny" && <Loader2 className="animate-spin" />}
            {t.deny}
          </Button>
          <Button className="flex-1" disabled={busy !== null || nothingChosen} onClick={() => answer(true)}>
            {busy === "allow" && <Loader2 className="animate-spin" />}
            {t.allow}
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
