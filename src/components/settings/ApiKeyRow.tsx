import { KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { COPY, type KeyRow } from "./api-keys-copy";

/** One key: its name and prefix, when it was last used and when it expires. */
export function ApiKeyRow({ apiKey: key, language, onRevoke }: { apiKey: KeyRow; language: "en" | "zh"; onRevoke: (key: KeyRow) => void }) {
  const t = COPY[language];
  const expired = key.expiresAt && new Date(key.expiresAt) < new Date();
  return (
    <li className="flex items-center gap-4 px-4 py-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <KeyRound className="size-4" />
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-body-md font-medium">{key.name || "—"}</span>
          {key.start && <span className="font-mono text-caption text-muted-foreground">{key.start}…</span>}
        </div>
        <div className="flex flex-wrap gap-x-3 text-caption text-muted-foreground">
          <span title={key.lastRequest ? formatDateTime(key.lastRequest, language) : undefined}>
            {key.lastRequest ? t.lastUsed(formatRelative(key.lastRequest, language)) : t.neverUsed}
          </span>
          <span className={expired ? "text-failure" : undefined}>
            {expired ? t.expired : key.expiresAt ? t.expiresOn(formatDateTime(key.expiresAt, language)) : t.noExpiry}
          </span>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={() => onRevoke(key)}>
        <Trash2 />
        {t.revoke}
      </Button>
    </li>
  );
}
