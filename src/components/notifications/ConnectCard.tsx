"use client";

import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import type { DestinationsResponse } from "@/contracts/notifications";
import type { ChannelKind } from "@/domain/notify";
import { CHANNEL_META, ChannelIcon } from "./channels";
import { COPY, type PasteKind } from "./settings-copy";

/** One service to connect: one click where the server has its app set up, else a pasted URL or the Telegram bot. */
export function ConnectCard({
  kind,
  data,
  onPaste,
  onTelegram,
}: {
  kind: ChannelKind;
  data: DestinationsResponse;
  onPaste: (kind: PasteKind) => void;
  onTelegram: () => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const meta = CHANNEL_META[kind];
  const { setup } = data;
  const enabled = setup.canManage && setup.secretKey;
  const oneClick = (kind === "slack" && setup.slack) || (kind === "discord" && setup.discord);

  let action: React.ReactNode;
  if (kind === "telegram") {
    action = setup.telegram ? (
      <Button size="sm" variant="outline" disabled={!enabled} onClick={onTelegram}>
        {t.telegramConnect}
      </Button>
    ) : (
      <span className="flex h-7 items-center text-caption text-muted-foreground">{t.notSetUp}</span>
    );
  } else if (oneClick) {
    action = (
      <div className="flex items-center gap-2">
        {enabled ? (
          <Button size="sm" asChild>
            {/* A full navigation: the provider's consent page is not part of this app. */}
            <a href={`/api/integrations/${kind}/install`}>{t.oneClick(meta.name[language])}</a>
          </Button>
        ) : (
          <Button size="sm" disabled>
            {t.oneClick(meta.name[language])}
          </Button>
        )}
        <button
          type="button"
          disabled={!enabled}
          onClick={() => onPaste(kind as PasteKind)}
          className="text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          {t.orPaste}
        </button>
      </div>
    );
  } else {
    action = (
      <Button size="sm" variant="outline" disabled={!enabled} onClick={() => onPaste(kind as PasteKind)}>
        {t.paste}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-border">
      <div className="flex items-center gap-3">
        <ChannelIcon kind={kind} />
        <span className="text-body-md font-semibold">{meta.name[language]}</span>
      </div>
      <p className="min-h-[2.5em] text-body-sm leading-5 text-muted-foreground">{meta.blurb[language]}</p>
      <div className="mt-auto">{action}</div>
    </div>
  );
}
