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
  const [link, setLink] = useState<TelegramLinkDto | null>(null);
  const [status, setStatus] = useState<TelegramLinkStatus["status"]>("pending");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLink(null);
    setStatus("pending");
    setError(null);
    sendJson<TelegramLinkDto>("/api/integrations/telegram/links", "POST", { language })
      .then((created) => !cancelled && setLink(created))
      .catch((cause) => !cancelled && setError(apiErrorText(cause, language)));
    return () => {
      cancelled = true;
    };
  }, [open, language, attempt]);

  useEffect(() => {
    if (!open || !link || status !== "pending") return;
    const timer = setInterval(async () => {
      // A failed poll is simply tried again on the next tick.
      const next = await fetch(`/api/integrations/telegram/links/${link.id}`)
        .then((response) => readJson<TelegramLinkStatus>(response))
        .catch(() => null);
      if (!next?.status || next.status === "pending") return;
      setStatus(next.status);
      if (next.status === "linked") onLinked();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [open, link, status, onLinked]);

  const minutesLeft = link ? Math.max(1, Math.round((new Date(link.expiresAt).getTime() - Date.now()) / 60_000)) : 0;
  return { link, status, error, minutesLeft, retry: () => setAttempt((n) => n + 1) };
}
