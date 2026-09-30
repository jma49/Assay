"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import { COPY } from "./api-keys-copy";

/** Copies `text` and reports it for a moment. */
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return { copied, copy };
}

export function CopyBlock({ text, label }: { text: string; label?: string }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const { copied, copy } = useCopy(text);
  return (
    <div className="grid min-w-0 gap-1.5">
      {label && <span className="text-caption font-medium text-muted-foreground">{label}</span>}
      <div className="flex min-w-0 items-start gap-2">
        <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-code px-3 py-2 font-mono text-caption leading-5 whitespace-pre">{text}</pre>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? t.copied : t.copy}
        </Button>
      </div>
    </div>
  );
}

/** The MCP endpoint inline, with a button to copy it. */
export function Endpoint({ url }: { url: string }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const { copied, copy } = useCopy(url);
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
      {t.endpoint}:
      <code className="rounded-sm bg-code px-1.5 py-0.5 font-mono text-caption text-foreground [font-variant-ligatures:none]">{url}</code>
      <Button variant="ghost" size="icon" className="size-6" onClick={copy} aria-label={copied ? t.copied : t.copy} title={copied ? t.copied : t.copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </p>
  );
}

/** How to point common agents at this server with a key. */
export function ConnectSnippets({ apiKey, endpoint }: { apiKey: string; endpoint: string }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const claude = `claude mcp add --transport http assay ${endpoint} \\\n  --header "Authorization: Bearer ${apiKey}"`;
  const json = JSON.stringify({ mcpServers: { assay: { url: endpoint, headers: { Authorization: `Bearer ${apiKey}` } } } }, null, 2);
  return (
    <div className="grid min-w-0 gap-3">
      <p className="text-body-sm font-medium">{t.connect}</p>
      <CopyBlock label={t.claudeCode} text={claude} />
      <CopyBlock label={t.other} text={json} />
    </div>
  );
}
