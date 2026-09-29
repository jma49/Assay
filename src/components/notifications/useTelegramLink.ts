import { useEffect, useState } from "react";
import { apiErrorText } from "@/client/api-errors";
import { readJson, sendJson } from "@/client/send-json";
import type { TelegramLinkDto, TelegramLinkStatus } from "@/contracts/notifications";

const POLL_MS = 2500;

/**
 * While `open`, creates a one-time Telegram link and polls it until the bot
 * receives its code or it expires. `retry` starts over with a new link;
 * `onLinked` fires once when the chat is connected.
 */
export function useTelegramLink(open: boolean, language: "en" | "zh", onLinked: () => void) {
  const [attempt, setAttempt] = useState(0);
  // Each opening is a new session, so reopening creates a new link.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }
  const request = open ? `${session} ${language} ${attempt}` : null;

  // What the request for this session, language and attempt produced; anything older is not shown.
  const [created, setCreated] = useState<{ request: string; link: TelegramLinkDto | null; minutesLeft: number; error: string | null } | null>(null);
  const current = created && created.request === request ? created : null;
  const link = current?.link ?? null;
  const [polled, setPolled] = useState<{ linkId: string; status: TelegramLinkStatus["status"] } | null>(null);
  const status = link && polled?.linkId === link.id ? polled.status : "pending";

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    sendJson<TelegramLinkDto>("/api/integrations/telegram/links", "POST", { language })
      .then((link) => {
        if (cancelled) return;
        const minutesLeft = Math.max(1, Math.round((new Date(link.expiresAt).getTime() - Date.now()) / 60_000));
        setCreated({ request, link, minutesLeft, error: null });
      })
      .catch((cause) => !cancelled && setCreated({ request, link: null, minutesLeft: 0, error: apiErrorText(cause, language) }));
    return () => {
      cancelled = true;
    };
  }, [request, language]);

  useEffect(() => {
    if (!open || !link || status !== "pending") return;
    const timer = setInterval(async () => {
      // A failed poll is simply tried again on the next tick.
      const next = await fetch(`/api/integrations/telegram/links/${link.id}`)
        .then((response) => readJson<TelegramLinkStatus>(response))
        .catch(() => null);
      if (!next?.status || next.status === "pending") return;
      setPolled({ linkId: link.id, status: next.status });
      if (next.status === "linked") onLinked();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [open, link, status, onLinked]);

  return { link, status, error: current?.error ?? null, minutesLeft: current?.minutesLeft ?? 0, retry: () => setAttempt((n) => n + 1) };
}
