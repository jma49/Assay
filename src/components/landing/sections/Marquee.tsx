import { Cloud, Database, Feather, GitBranch, HardDrive, Hash, MessageCircle, MessagesSquare, MousePointer2, Plug, Send, SquareTerminal, Webhook, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";

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
      <div data-reverse={reverse ? "" : undefined} className={cn("marquee-track flex w-max gap-14 pr-14 text-title font-medium", className)}>
        {loop.map(([Icon, name], i) => (
          <span key={i} aria-hidden={i >= items.length} className="inline-flex items-center gap-2.5 whitespace-nowrap">
            <Icon className="size-5" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Marquee({ caption }: { caption: string }) {
  return (
    <section className="marquee relative border-y border-night-line bg-night py-12">
      <p className="mb-7 text-center text-caption text-night-muted">{caption}</p>
      <div className="marquee-fade space-y-5">
        <Row items={SOURCES} className="text-night-muted/70" />
        <Row items={CHANNELS} reverse className="text-night-muted/50" />
      </div>
    </section>
  );
}
