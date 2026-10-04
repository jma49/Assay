"use client";

import "./landing.css";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useCurrentUser } from "@/lib/auth/client";
import { CalendarClock, GitPullRequest, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { BRAND, GITHUB_URL, QUICK_START, landingCopy, type Language } from "./content";
import { Demo, DemoFrame } from "./demo-panels";
import { DemoVideo } from "./DemoVideo";
import { BrandMark } from "@/components/common/BrandMark";
import { HighlightedLine } from "@/components/code/HighlightedLine";
import { useHydrated } from "@/components/common/use-hydrated";

/** Shared horizontal frame: every section aligns to the same left and right edges. */
const CONTAINER = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";

const secondaryButton =
  "inline-flex h-9 items-center justify-center rounded-full bg-card px-4 text-body-md font-medium shadow-border hover:shadow-border-hover transition-[filter,box-shadow,background-color,scale] duration-150 ease-out active:scale-[0.96]";
const heroPrimaryButton =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-primary px-7 max-sm:h-11 max-sm:px-5 max-sm:text-body-md text-body-lg font-medium text-primary-foreground shadow-[0_12px_32px_-12px_var(--primary)] hover:brightness-110 transition-[filter,box-shadow,background-color,scale] duration-150 ease-out active:scale-[0.96]";
const heroSecondaryButton =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-card px-7 max-sm:h-11 max-sm:px-5 max-sm:text-body-md text-body-lg font-medium shadow-border hover:shadow-border-hover transition-[filter,box-shadow,background-color,scale] duration-150 ease-out active:scale-[0.96]";

const WHY_ICONS = [ShieldCheck, CalendarClock, GitPullRequest, Sparkles];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-label-caps uppercase text-muted-foreground">{children}</p>;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function Nav({ lang, setLang }: { lang: Language; setLang: (l: Language) => void }) {
  const t = landingCopy[lang].nav;
  const session = useCurrentUser();
  return (
    <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
      <nav className={`${CONTAINER} flex h-14 items-center justify-between`}>
        <Link href="/">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-6 pr-4 text-body-md text-foreground/80 md:flex">
            <a href="#features" className="hover:text-foreground">{t.features}</a>
            <a href="#self-host" className="hover:text-foreground">{t.quickStart}</a>
            <a href="#faq" className="hover:text-foreground">{t.faq}</a>
            <Link href="/docs" className="hover:text-foreground">{lang === "zh" ? "文档" : "Docs"}</Link>
            <a href={GITHUB_URL} className="hover:text-foreground">GitHub</a>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="inline-flex h-8 items-center rounded-full px-2.5 text-body-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
          <ThemeToggle />
          {/* Holds the button's width while the session loads so the nav does not shift. */}
          {!session.isLoaded ? (
            <span className="ml-1 inline-block h-8 w-[118px]" aria-hidden />
          ) : session.user ? (
            <Link href="/checks" className={`${secondaryButton} ml-1 h-8 px-3 text-body-sm`}>
              {t.openApp}
            </Link>
          ) : (
            <Link href="/sign-in?redirect_url=/checks" className={`${secondaryButton} ml-1 h-8 px-3 text-body-sm`}>
              {t.signIn}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

function FeatureSection({ lang, index }: { lang: Language; index: number }) {
  const section = landingCopy[lang].sections[index];
  const [active, setActive] = useState(0);
  // The middle section mirrors the layout (list left, demo right), as on inkdrop.app.
  const mirrored = index % 2 === 1;

  return (
    <section id={section.id} className="py-14 sm:py-20">
      <div className={CONTAINER}>
        <div className="max-w-[640px]">
          <Eyebrow>{section.eyebrow}</Eyebrow>
          <h2 className="display mt-4 text-display-sm  text-foreground sm:text-display-lg">
            {section.title}
          </h2>
          <p className="mt-4 text-pretty text-body-lg leading-7 text-muted-foreground">{section.lead}</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-12 md:gap-8">
          <div className={`order-2 min-w-0 md:col-span-8 ${mirrored ? "md:order-2" : "md:order-1"}`}>
            <Demo kind={section.items[active].demo} lang={lang} />
          </div>
          <ul
            className={`order-1 flex flex-col gap-1 md:col-span-4 ${mirrored ? "md:order-1" : "md:order-2"}`}
            role="tablist"
          >
            {section.items.map((item, i) => (
              <li key={item.demo}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => setActive(i)}
                  className={`group w-full rounded-xl py-3 pr-3 pl-4 text-left transition-[background-color] duration-150 ${
                    i === active ? "bg-primary-soft" : "hover:bg-muted"
                  }`}
                >
                  <span className="block text-body-md font-medium">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-body-sm leading-5 text-muted-foreground">
                    {item.body}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** `demo`: the workspace runs in demo mode, so visitors can look around as guests. */
export default function LandingPage({ demo = false }: { demo?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const t = landingCopy[language];
  const session = useCurrentUser();

  return (
    <div className="landing min-h-screen">
      <Nav lang={language} setLang={setLanguage} />

      <main>
        <section className="relative pt-14 sm:pt-16">
          {/* A quiet wash of the accent behind the headline, fading out before the product preview ends. */}
          <div aria-hidden className="absolute inset-x-0 top-0 bottom-40 bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_70%)] sm:bottom-56" />
          <div className={`${CONTAINER} relative`}>
            <div className="mx-auto max-w-[980px] text-center">
              <h1 className="display text-balance text-display-lg  sm:text-display-xl lg:whitespace-nowrap">
                {t.hero.title}
              </h1>
              <p className="mx-auto mt-5 max-w-[560px] text-pretty text-title-sm leading-7 font-normal text-muted-foreground">
                {t.hero.subtitle}
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link href={demo ? "/demo" : "/checks"} prefetch={false} className={heroPrimaryButton}>
                  {t.hero.primary}
                </Link>
                <a href={GITHUB_URL} className={heroSecondaryButton}>
                  {t.hero.secondary}
                </a>
              </div>
              {session.isLoaded && !session.user && (
                <p className="mt-4 text-body-sm text-muted-foreground">{demo ? t.hero.guestNote : t.hero.demoNote}</p>
              )}
            </div>
            <div className="mt-14 sm:mt-16">
              <DemoFrame title="assay.majincheng.com" meta={<span className="max-sm:hidden">{t.hero.videoMeta}</span>} bodyClassName="" chrome elevated>
                <DemoVideo lang={language} />
              </DemoFrame>
            </div>
          </div>
        </section>

        <section id="features" className="pt-16 pb-6 sm:pt-20 sm:pb-8">
          <div className={CONTAINER}>
            <div className="max-w-[640px]">
              <Eyebrow>{t.why.eyebrow}</Eyebrow>
              <h2 className="display mt-3 text-display-sm  sm:text-display-md">
                {t.why.title}
              </h2>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-xl bg-border shadow-border sm:grid-cols-2 lg:grid-cols-4">
              {t.why.cards.map((card, i) => {
                const Icon = WHY_ICONS[i % WHY_ICONS.length];
                return (
                <div key={card.title} className="bg-card p-6">
                  {/* One colour for all four: green, amber and red mean run statuses elsewhere. */}
                  <span className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="size-[18px]" />
                  </span>
                  <h3 className="display text-title-sm">{card.title}</h3>
                  <p className="mt-2 text-body-md leading-6 text-muted-foreground">{card.body}</p>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {t.sections.map((section, i) => (
          <FeatureSection key={section.id} lang={language} index={i} />
        ))}

        <section id="self-host" className="bg-muted py-20 sm:py-24">
          <div className={`${CONTAINER} grid gap-10 md:grid-cols-2 md:gap-8`}>
            <div>
              <Eyebrow>{t.quickStart.eyebrow}</Eyebrow>
              <h2 className="display mt-3 text-display-sm  sm:text-display-md">
                {t.quickStart.title}
              </h2>
              <p className="mt-4 text-body-lg leading-7 text-muted-foreground">{t.quickStart.body}</p>
              <Link
                href="/docs/deployment"
                className="mt-6 inline-block text-body-md underline underline-offset-4 hover:opacity-80"
              >
                {t.quickStart.readme} →
              </Link>
            </div>
            <DemoFrame title="Terminal" bodyClassName="" chrome>
              <pre className="mono overflow-x-auto bg-code px-4 py-4 text-body-sm leading-6">
                {QUICK_START.split("\n").map((line, i) => (
                  <div key={i} className="whitespace-pre">
                    {line ? <HighlightedLine text={line} language="shell" /> : " "}
                  </div>
                ))}
              </pre>
            </DemoFrame>
          </div>
        </section>

        <section id="faq" className="border-t border-border py-20 sm:py-24">
          <div className={`${CONTAINER} grid gap-8 md:grid-cols-12`}>
            <h2 className="display text-display-sm  md:col-span-4 sm:text-display-md">
              {t.faq.title}
            </h2>
            <div className="border-t border-border md:col-span-8">
              {t.faq.items.map((item) => (
                <details key={item.q} className="group border-b border-border">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-body-lg leading-normal font-medium">
                    {item.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-4 text-body-md leading-6 text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className={`${CONTAINER} flex flex-col gap-3 text-body-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between`}>
          <span>
            <span className="display text-body-lg leading-normal font-semibold text-foreground">{BRAND}</span> · {t.footer}
          </span>
          <span className="flex gap-6">
            <a href={GITHUB_URL} className="hover:text-foreground">GitHub</a>
            {session.user ? (
              <Link href="/checks" className="hover:text-foreground">{t.nav.openApp}</Link>
            ) : (
              <Link href="/sign-in?redirect_url=/checks" className="hover:text-foreground">{t.nav.signIn}</Link>
            )}
          </span>
        </div>
      </footer>
    </div>
  );
}
