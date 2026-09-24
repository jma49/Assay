"use client";

import "./landing.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ClerkLoading, SignedIn, SignedOut } from "@clerk/nextjs";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { BRAND, GITHUB_URL, QUICK_START, landingCopy, type Language } from "./content";
import { Demo, DemoFrame, RECENT_RUNS, StatusDot } from "./demo-panels";

/** Shared horizontal frame: every section aligns to the same left and right edges. */
const CONTAINER = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";

const primaryButton =
  "inline-flex h-10 items-center justify-center rounded-md bg-(--l-fg) px-5 text-[14px] font-medium text-(--l-bg) transition-opacity hover:opacity-85";
const secondaryButton =
  "inline-flex h-10 items-center justify-center rounded-md border border-(--l-line) px-5 text-[14px] font-medium transition-colors hover:bg-(--l-panel)";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] tracking-wide text-(--l-muted) uppercase">{children}</p>;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex size-8 items-center justify-center rounded-md text-(--l-muted) hover:text-(--l-fg)"
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function Nav({ lang, setLang }: { lang: Language; setLang: (l: Language) => void }) {
  const t = landingCopy[lang].nav;
  return (
    <header className="sticky top-0 z-20 border-b border-(--l-line) bg-(--l-bg)/90 backdrop-blur">
      <nav className={`${CONTAINER} flex h-14 items-center justify-between`}>
        <Link href="/" className="serif text-[20px] font-semibold tracking-tight">
          {BRAND}
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-6 pr-4 text-[14px] text-(--l-muted) md:flex">
            <a href="#features" className="hover:text-(--l-fg)">{t.features}</a>
            <a href="#self-host" className="hover:text-(--l-fg)">{t.quickStart}</a>
            <a href="#faq" className="hover:text-(--l-fg)">{t.faq}</a>
            <a href={GITHUB_URL} className="hover:text-(--l-fg)">GitHub</a>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="inline-flex h-8 items-center rounded-md px-2 text-[13px] text-(--l-muted) hover:text-(--l-fg)"
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
          <ThemeToggle />
          {/* Holds the button's width while Clerk loads so the nav does not shift. */}
          <ClerkLoading>
            <span className="ml-1 inline-block h-8 w-[118px]" aria-hidden />
          </ClerkLoading>
          <SignedOut>
            <Link href="/sign-in?redirect_url=/dashboard" className={`${secondaryButton} ml-1 h-8 px-3 text-[13px]`}>
              {t.signIn}
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className={`${secondaryButton} ml-1 h-8 px-3 text-[13px]`}>
              {t.openApp}
            </Link>
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}

function ProductPreview({ lang }: { lang: Language }) {
  const zh = lang === "zh";
  return (
    <DemoFrame
      title={BRAND}
      meta={zh ? "11 个检查 · 8 个需要关注" : "11 checks · 8 need attention"}
      bodyClassName="h-[380px] sm:h-[420px]"
    >
      <div className="grid h-full grid-cols-12">
        <aside className="col-span-4 hidden border-r border-(--l-line) md:block">
          <p className="px-4 pt-4 pb-2 text-[12px] text-(--l-muted) uppercase">{zh ? "最近执行" : "Recent runs"}</p>
          <ul className="text-[13px]">
            {RECENT_RUNS.map((run, i) => (
              <li
                key={run.en}
                className={`flex items-center gap-2.5 px-4 py-2 ${i === 0 ? "bg-(--l-panel)" : ""}`}
              >
                <StatusDot status={run.status} />
                <span className="flex-1 truncate">{run[lang]}</span>
                <span className="text-(--l-muted) tabular-nums">{run.status === "failed" ? "—" : run.found}</span>
              </li>
            ))}
          </ul>
        </aside>
        <div className="col-span-12 flex min-w-0 flex-col md:col-span-8">
          <div className="flex items-baseline justify-between gap-4 border-b border-(--l-line) px-5 py-4">
            <div className="min-w-0">
              <p className="serif truncate text-[20px] font-semibold">{zh ? "重复下单" : "Duplicate orders"}</p>
              <p className="mt-1 truncate text-[13px] text-(--l-muted)">
                {zh ? "同一客户 5 分钟内以相同金额重复下单" : "Same customer, same total, within 5 minutes"}
              </p>
            </div>
            <span className="shrink-0 text-[13px]" style={{ color: "var(--l-attention)" }}>
              {zh ? "发现 6 条" : "6 found"}
            </span>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-(--l-line) text-(--l-muted)">
                <th className="px-5 py-2.5 text-left font-normal">{zh ? "订单" : "Order"}</th>
                <th className="px-5 py-2.5 text-left font-normal">{zh ? "重复订单" : "Duplicate"}</th>
                <th className="hidden px-5 py-2.5 text-left font-normal sm:table-cell">{zh ? "客户" : "Customer"}</th>
                <th className="px-5 py-2.5 text-right font-normal">{zh ? "金额" : "Total"}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[
                [12, 1501, 88, "412.60"],
                [19, 1502, 141, "96.40"],
                [23, 1503, 7, "1,208.00"],
                [31, 1504, 162, "57.99"],
                [44, 1505, 23, "640.15"],
                [58, 1506, 105, "233.70"],
              ].map(([order, dup, customer, total]) => (
                <tr key={order} className="border-b border-(--l-line) last:border-0">
                  <td className="px-5 py-2.5">#{order}</td>
                  <td className="px-5 py-2.5">#{dup}</td>
                  <td className="hidden px-5 py-2.5 sm:table-cell">{customer}</td>
                  <td className="px-5 py-2.5 text-right">${total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DemoFrame>
  );
}

function FeatureSection({ lang, index }: { lang: Language; index: number }) {
  const section = landingCopy[lang].sections[index];
  const [active, setActive] = useState(0);

  return (
    <section id={section.id} className="border-t border-(--l-line) py-20 sm:py-24">
      <div className={CONTAINER}>
        <div className="max-w-[640px]">
          <Eyebrow>{section.eyebrow}</Eyebrow>
          <h2 className="serif mt-3 text-[28px] leading-tight font-semibold tracking-tight sm:text-[34px]">
            {section.title}
          </h2>
          <p className="mt-4 text-pretty text-[16px] leading-7 text-(--l-muted)">{section.lead}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-12 md:gap-8">
          <div className="order-2 min-w-0 md:order-1 md:col-span-8">
            <Demo kind={section.items[active].demo} lang={lang} />
          </div>
          <ul className="order-1 flex flex-col gap-2 md:order-2 md:col-span-4" role="tablist">
            {section.items.map((item, i) => (
              <li key={item.demo}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => setActive(i)}
                  className={`w-full border-l-2 py-3 pr-2 pl-4 text-left transition-colors ${
                    i === active
                      ? "border-(--l-fg) bg-(--l-panel)"
                      : "border-transparent hover:bg-(--l-panel)"
                  }`}
                >
                  <span className="block text-[14px] font-medium">{item.title}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-(--l-muted)">{item.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { language, setLanguage } = useLanguage();
  const t = landingCopy[language];

  return (
    <div className="landing min-h-screen">
      <Nav lang={language} setLang={setLanguage} />

      <main>
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className={CONTAINER}>
            <div className="mx-auto max-w-[760px] text-center">
              <h1 className="serif text-balance text-[38px] leading-[1.1] font-semibold tracking-tight sm:text-[56px]">
                {t.hero.title}
              </h1>
              <p className="mx-auto mt-5 max-w-[560px] text-pretty text-[17px] leading-7 text-(--l-muted)">
                {t.hero.subtitle}
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link href="/dashboard" className={primaryButton}>
                  {t.hero.primary}
                </Link>
                <a href={GITHUB_URL} className={secondaryButton}>
                  {t.hero.secondary}
                </a>
              </div>
              <SignedOut>
                <p className="mt-4 text-[13px] text-(--l-muted)">{t.hero.demoNote}</p>
              </SignedOut>
            </div>
            <div className="mt-14 sm:mt-16">
              <ProductPreview lang={language} />
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-(--l-line) py-20 sm:py-24">
          <div className={CONTAINER}>
            <div className="max-w-[640px]">
              <Eyebrow>{t.why.eyebrow}</Eyebrow>
              <h2 className="serif mt-3 text-[28px] leading-tight font-semibold tracking-tight sm:text-[34px]">
                {t.why.title}
              </h2>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-(--l-line) bg-(--l-line) sm:grid-cols-2 lg:grid-cols-4">
              {t.why.cards.map((card) => (
                <div key={card.title} className="bg-(--l-bg) p-6">
                  <h3 className="serif text-[19px] font-semibold">{card.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-(--l-muted)">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {t.sections.map((section, i) => (
          <FeatureSection key={section.id} lang={language} index={i} />
        ))}

        <section id="self-host" className="border-t border-(--l-line) py-20 sm:py-24">
          <div className={`${CONTAINER} grid gap-10 md:grid-cols-2 md:gap-8`}>
            <div>
              <Eyebrow>{t.quickStart.eyebrow}</Eyebrow>
              <h2 className="serif mt-3 text-[28px] leading-tight font-semibold tracking-tight sm:text-[34px]">
                {t.quickStart.title}
              </h2>
              <p className="mt-4 text-[16px] leading-7 text-(--l-muted)">{t.quickStart.body}</p>
              <a
                href={`${GITHUB_URL}#readme`}
                className="mt-6 inline-block text-[14px] underline underline-offset-4 hover:opacity-80"
              >
                {t.quickStart.readme} →
              </a>
            </div>
            <DemoFrame title="Terminal" bodyClassName="">
              <pre className="mono overflow-x-auto bg-(--l-code-bg) px-4 py-4 text-[13px] leading-6">
                {QUICK_START.split("\n").map((line, i) => (
                  <div key={i} className={line.startsWith("#") ? "text-(--l-muted)" : ""}>
                    {line || " "}
                  </div>
                ))}
              </pre>
            </DemoFrame>
          </div>
        </section>

        <section id="faq" className="border-t border-(--l-line) py-20 sm:py-24">
          <div className={`${CONTAINER} grid gap-8 md:grid-cols-12`}>
            <h2 className="serif text-[28px] leading-tight font-semibold tracking-tight md:col-span-4 sm:text-[34px]">
              {t.faq.title}
            </h2>
            <div className="border-t border-(--l-line) md:col-span-8">
              {t.faq.items.map((item) => (
                <details key={item.q} className="group border-b border-(--l-line)">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium">
                    {item.q}
                    <span className="text-(--l-muted) transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-4 text-[14px] leading-6 text-(--l-muted)">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--l-line) py-10">
        <div className={`${CONTAINER} flex flex-col gap-3 text-[13px] text-(--l-muted) sm:flex-row sm:items-center sm:justify-between`}>
          <span>
            <span className="serif text-[15px] font-semibold text-(--l-fg)">{BRAND}</span> · {t.footer}
          </span>
          <span className="flex gap-6">
            <a href={GITHUB_URL} className="hover:text-(--l-fg)">GitHub</a>
            <SignedOut>
              <Link href="/sign-in?redirect_url=/dashboard" className="hover:text-(--l-fg)">{t.nav.signIn}</Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="hover:text-(--l-fg)">{t.nav.openApp}</Link>
            </SignedIn>
          </span>
        </div>
      </footer>
    </div>
  );
}
