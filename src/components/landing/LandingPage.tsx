"use client";

import "./landing.css";
import { useCurrentUser } from "@/lib/auth/client";
import { useLanguage } from "@/components/common/LanguageProvider";
import { cn } from "@/lib/utils/utils";
import { landingCopy } from "./content";
import { landingMono, landingSans, landingSerif } from "./fonts";
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
    <div className={cn("theme-light landing min-h-screen overflow-x-clip", landingSans.variable, landingMono.variable, landingSerif.variable)}>
      <Nav copy={t.nav} language={language} setLanguage={setLanguage} demoHref={demoHref} />
      <main>
        <Hero copy={t.hero} outcomeCopy={t.outcome} language={language} demoHref={demoHref} note={note} />
        <Marquee label={t.labels.integrations} caption={t.marquee} />
        <Manifesto label={t.labels.idea} parts={t.manifesto} />
        <Bento label={t.labels.product} copy={t.bento} />
        <RunAnatomy label={t.labels.run} copy={t.run} />
        <Scenarios label={t.labels.scenarios} copy={t.scenarios} outcomeCopy={t.outcome} demoHref={demoHref} />
        <Workflow label={t.labels.workflow} copy={t.workflow} language={language} />
        <SelfHost label={t.labels.selfHost} copy={t.selfHost} />
        <Faq label={t.labels.faq} copy={t.faq} />
        <FinalCta copy={t.cta} demoHref={demoHref} />
      </main>
      <Footer copy={t.footer} demoHref={demoHref} language={language} setLanguage={setLanguage} />
    </div>
  );
}
