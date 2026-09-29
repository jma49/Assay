"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COPY, EXPIRY_DAYS } from "./api-keys-copy";
import { ConnectSnippets, CopyBlock } from "./KeySnippets";

/**
 * Names a new key and picks its expiry; once created, shows the key (only
 * this once) with the commands that connect an agent to `endpoint`.
 */
export function CreateKeyDialog({
  open,
  onOpenChange,
  language,
  endpoint,
  create,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "en" | "zh";
  endpoint: string;
  create: (name: string, days: number) => Promise<string | null>;
}) {
  const t = COPY[language];
  const [name, setName] = useState("");
  const [days, setDays] = useState<number>(90);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const close = () => {
    onOpenChange(false);
    setCreated(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const key = await create(name, days);
    setBusy(false);
    if (!key) return;
    setCreated(key);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
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
              <Button onClick={close}>{t.done}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
