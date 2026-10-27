"use client";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/kit.css";
import { memo, useLayoutEffect } from "react";
import { currentLanguage } from "@/components/common/LanguageProvider";
import { LandingProvider, Later, laterPending, useLanding } from "./lib/context";
import type { Release } from "./release";
import { useCopy } from "./lib/i18n";
import { MotionGuard, useLandingLifetime, useMotion } from "./lib/motion";
import { applyPrepaint, Prepaint } from "./lib/prepaint";
import { flags } from "./lib/runtime";
import { Faq } from "./sections/faq/Faq";
import { Final } from "./sections/final/Final";
import { Footer } from "./sections/footer/Footer";
import { Hero } from "./sections/hero/Hero";
import { Interlude } from "./sections/interlude/Interlude";
import { navCopy } from "./sections/nav/copy";
import { Nav } from "./sections/nav/Nav";
import { Outcomes } from "./sections/outcomes/Outcomes";
import { Run } from "./sections/run/Run";
import { Safety } from "./sections/safety/Safety";
import { Selfhost } from "./sections/selfhost/Selfhost";
import { Workflow } from "./sections/workflow/Workflow";

/** The light table: a dark room, a light box, the database held up to the light as film. */
export default function LandingPage({ demo = false, release }: { demo?: boolean; release: Release }) {
  return (
    <LandingProvider demo={demo} release={release}>
      <Room />
    </LandingProvider>
  );
}

function Room() {
  const { language } = useLanding();
  const skip = useCopy(navCopy).skip;
  const ref = useMotion<HTMLDivElement>(() => import("./lib/page.motion"));

  // A client-side navigation never ran the inline script; leaving the page takes every flag off <html>.
  useLandingLifetime(applyPrepaint);
  // Chinese stored, English painted by the server: show the text once React has swapped it (the sections under the
  // hero wait for their own render, lib/context.tsx Later).
  useLayoutEffect(() => {
    if (language !== currentLanguage() || !flags.has("zh-wait")) return;
    flags.set("zh-wait", false);
    flags.set("zh-later", laterPending());
  }, [language]);

  return (
    <MotionGuard language={language}>
      <div ref={ref} className="lt" lang={language === "zh" ? "zh-CN" : "en"}>
        <Prepaint />
        <a className="skip" href="#main">
          {skip}
        </a>
        <Nav />
        <main id="main">
          <Hero />
          <Later>
            <Sections />
          </Later>
        </main>
        <Footer />
      </div>
    </MotionGuard>
  );
}

/** Everything between the hero and the footer; memo keeps it out of the render that swaps the hero's language. */
const Sections = memo(function Sections() {
  return (
    <>
      <Run />
      <Safety />
      <Outcomes />
      <Workflow />
      <Interlude />
      <Selfhost />
      <Faq />
      <Final />
    </>
  );
});
