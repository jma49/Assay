"use client";

import "./landing.css";
import { useCurrentUser } from "@/lib/auth/client";
import { useLanguage } from "@/components/common/LanguageProvider";
import { cn } from "@/lib/utils/utils";
import { landingCopy } from "./content";
import { landingMono, landingSans } from "./fonts";
import { Bento } from "./sections/Bento";
import { Faq } from "./sections/Faq";
import { FinalCta } from "./sections/FinalCta";
import { Footer } from "./sections/Footer";
import { Hero } from "./sections/Hero";
import { Manifesto } from "./sections/Manifesto";
import { Marquee } from "./sections/Marquee";
import { Nav } from "./sections/Nav";
import { RunAnatomy } from "./sections/RunAnatomy";
import { Scenarios } from "./sections/Scenarios";
import { SelfHost } from "./sections/SelfHost";
import { Workflow } from "./sections/Workflow";

/** `demo`: the workspace runs in demo mode, so visitors can look around as guests. */
export default function LandingPage({ demo = false }: { demo?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const t = landingCopy[language];
  const session = useCurrentUser();
  const demoHref = demo ? "/demo" : "/checks";
  const note = session.isLoaded && !session.user ? (demo ? t.hero.guestNote : t.hero.demoNote) : null;

  return (
    <div className={cn("landing min-h-screen overflow-x-clip", landingSans.variable, landingMono.variable)}>
      <Nav copy={t.nav} language={language} setLanguage={setLanguage} demoHref={demoHref} />
      <main>
        <Hero copy={t.hero} outcomeCopy={t.outcome} language={language} demoHref={demoHref} note={note} />
        <Marquee caption={t.marquee} />
        <Manifesto parts={t.manifesto} />
        <Bento copy={t.bento} />
        <RunAnatomy copy={t.run} />
        <Scenarios copy={t.scenarios} outcomeCopy={t.outcome} demoHref={demoHref} />
        <Workflow copy={t.workflow} language={language} />
        <SelfHost copy={t.selfHost} />
        <Faq copy={t.faq} />
        <FinalCta copy={t.cta} demoHref={demoHref} />
      </main>
      <Footer copy={t.footer} demoHref={demoHref} language={language} setLanguage={setLanguage} />
    </div>
  );
}
