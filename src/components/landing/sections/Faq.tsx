import { Plus } from "lucide-react";
import type { LandingCopy } from "../content";
import { INSET, Section } from "../ui";

export function Faq({ label, copy }: { label: string; copy: LandingCopy["faq"] }) {
  return (
    <Section id="faq" frameClassName="grid md:grid-cols-12">
      <div className={`${INSET} pb-8 pt-20 md:col-span-4 md:py-24`}>
        <p className="eyebrow text-caption text-ink-muted">{label}</p>
        <h2 className="font-editorial mt-4 text-display-lg text-ink">{copy.title}</h2>
      </div>
      <div className="border-t border-rule md:col-span-8 md:border-l md:border-t-0">
        {copy.items.map((item) => (
          <details key={item.q} className="group border-b border-rule px-5 py-6 last:border-b-0 md:px-10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
              {item.q}
              <Plus className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-3 max-w-2xl text-body-md text-ink-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
