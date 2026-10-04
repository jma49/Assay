import { Plus } from "lucide-react";
import type { LandingCopy } from "../content";
import { CONTAINER } from "../ui";

export function Faq({ copy }: { copy: LandingCopy["faq"] }) {
  return (
    <section id="faq" data-landing-light className="border-t border-border bg-background py-16 text-foreground md:py-20">
      <div className={`${CONTAINER} grid gap-10 md:grid-cols-12`}>
        <h2 className="text-display-sm md:col-span-4 md:text-display-md">{copy.title}</h2>
        <div className="divide-y divide-border border-y border-border md:col-span-8">
          {copy.items.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title-sm font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 max-w-2xl text-body-md text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
