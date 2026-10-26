"use client";

/**
 * What every section may read during render: the language (from the app's LanguageProvider, "assay-language"), the
 * demo links and the session. `useLanding()` in any component under <LandingProvider>.
 *
 *   language, setLanguage    "en" | "zh"; the switch tears motion down before React swaps the text (lib/motion.ts)
 *   demo, demoHref           demo mode: the demo CTA goes to /demo, otherwise /checks
 *   session                  "loading" | "guest" | "user" (from useCurrentUser)
 *   links                    the shared destinations (GitHub, docs, sign-in, the app)
 *   release                  the version, Next.js major and Node minimum the self-host plate engraves
 */
import { createContext, useContext, useDeferredValue, useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { currentLanguage, useLanguage } from "@/components/common/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/client";
import { GITHUB_URL } from "@/lib/brand";
import type { Release } from "../release";
import { flags, type Language } from "./runtime";

type Session = "loading" | "guest" | "user";

const LINKS = {
  github: GITHUB_URL,
  license: `${GITHUB_URL}/blob/main/LICENSE`,
  docs: "/docs",
  faq: "/docs/faq",
  mcp: "/docs/api-keys",
  guide: "/docs/deployment",
  signIn: "/sign-in?redirect_url=/checks",
  app: "/checks",
} as const;

export interface Landing {
  language: Language;
  setLanguage: (language: Language) => void;
  demo: boolean;
  demoHref: string;
  session: Session;
  links: typeof LINKS;
  release: Release;
}

const LandingContext = createContext<Landing | null>(null);

export function LandingProvider({ demo, release, children }: { demo: boolean; release: Release; children: ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const { user, isLoaded } = useCurrentUser();
  const session: Session = !isLoaded ? "loading" : user ? "user" : "guest";
  const value = useMemo<Landing>(
    () => ({ language, setLanguage, demo, demoHref: demo ? "/demo" : "/checks", session, links: LINKS, release }),
    [language, setLanguage, demo, session, release],
  );
  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

export function useLanding(): Landing {
  const value = useContext(LandingContext);
  if (!value) throw new Error("useLanding() outside <LandingProvider>");
  return value;
}

/* Whether the visit's first language swap has reached the sections under the hero (once per page load). */
let swapped = false;
const swapListeners = new Set<() => void>();
const subscribeSwap = (listener: () => void) => {
  swapListeners.add(listener);
  return () => {
    swapListeners.delete(listener);
  };
};

/** The sections under the hero still show the server's English (their first swap is one render behind). */
export const laterPending = () => !swapped;

/**
 * The sections under the hero take a Chinese reader's first swap one render later (React's deferred value), so the
 * visit's first Chinese render is two short tasks instead of one long one; they stay hidden (lt-zh-later) until then.
 * Every later switch reaches them in the same render as the rest of the page.
 */
export function Later({ children }: { children: ReactNode }) {
  const landing = useLanding();
  const deferred = useDeferredValue(landing.language);
  const done = useSyncExternalStore(subscribeSwap, () => swapped, () => false);
  const language = done ? landing.language : deferred;
  const { setLanguage, demo, demoHref, session, links, release } = landing;
  const value = useMemo<Landing>(
    () => ({ language, setLanguage, demo, demoHref, session, links, release }),
    [language, setLanguage, demo, demoHref, session, links, release],
  );
  useLayoutEffect(() => {
    if (swapped || language !== currentLanguage()) return;
    swapped = true;
    flags.set("zh-later", false);
    swapListeners.forEach((listener) => listener());
  }, [language]);
  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}
