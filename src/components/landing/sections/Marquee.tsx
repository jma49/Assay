import { Cloud, Database, Feather, GitBranch, HardDrive, Hash, MessageCircle, MessagesSquare, MousePointer2, Plug, Send, SquareTerminal, Webhook, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Section } from "../ui";

// Where checks run and where alerts go, as listed in the README.
const SOURCES: [LucideIcon, string][] = [
  [Database, "PostgreSQL"], [Cloud, "Neon"], [HardDrive, "Amazon RDS"], [SquareTerminal, "Claude Code"],
  [MousePointer2, "Cursor"], [GitBranch, "GitHub Actions"], [Plug, "MCP"],
];
const CHANNELS: [LucideIcon, string][] = [
  [Hash, "Slack"], [MessageCircle, "Discord"], [Send, "Telegram"], [Feather, "Feishu"], [MessagesSquare, "WeCom"], [Webhook, "Signed webhooks"],
];

function Row({ items, reverse, className }: { items: [LucideIcon, string][]; reverse?: boolean; className?: string }) {
  // Three copies, scrolled by a third, so the loop never shows a seam on wide screens.
  const loop = [...items, ...items, ...items];
  return (
    <div className="overflow-hidden">
      <div data-reverse={reverse ? "" : undefined} className={cn("marquee-track flex w-max gap-12 pr-12 text-title-sm font-medium", className)}>
        {loop.map(([Icon, name], i) => (
          <span key={i} aria-hidden={i >= items.length} className="inline-flex items-center gap-2.5 whitespace-nowrap">
            <Icon className="size-4" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Marquee({ label, caption }: { label: string; caption: string }) {
  return (
    <Section frameClassName="marquee grid md:grid-cols-[240px_minmax(0,1fr)]">
      <div className="border-b border-rule px-5 py-6 md:border-b-0 md:border-r md:px-8 md:py-10">
        <p className="eyebrow text-caption text-ink-muted">{label}</p>
        <p className="mt-3 text-body-sm text-ink-muted">{caption}</p>
      </div>
      <div className="marquee-fade min-w-0 space-y-5 py-8 md:py-10">
        <Row items={SOURCES} className="text-ink" />
        <Row items={CHANNELS} reverse className="text-ink-muted" />
      </div>
    </Section>
  );
}
