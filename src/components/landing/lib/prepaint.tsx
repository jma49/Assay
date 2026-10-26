"use client";

/**
 * The pre-paint state flags, set on <html> before the landing's first paint:
 *   lt-js        the script ran (without it the markup alone is the settled page)
 *   lt-intro     a first visit in this session, no #hash, motion allowed: the hero plays its switch-on
 *   lt-push      not the intro, motion allowed, scroll timelines supported: the desktop push-in is on
 *   lt-zh-wait   Chinese was chosen but the server painted English: the text stays hidden until React swaps it
 *   lt-run-story motion allowed and the window has room: the run section is the pinned story from the first paint
 *                (sections/run/run.motion.ts keeps it in step with the window)
 * A 4 s fallback drops lt-intro (unless the hero is playing) and lt-zh-wait.
 *
 * <Prepaint /> renders the script inline at the top of the landing for the server HTML (it runs while the page is
 * parsed) and keeps it through hydration; a client-side navigation renders no script and runs the same code through
 * applyPrepaint() instead. Both read and write window.__lt ({ first, playing }), shared with lib/runtime.ts.
 */
import { useSyncExternalStore } from "react";

const SCRIPT = `(function(){var d=document,r=d.documentElement,c=r.classList,s=window.__lt||(window.__lt={});c.add("lt-js");
try{var l=d.querySelector(".lt");if(localStorage.getItem("assay-language")==="zh"&&!(l&&/^zh/.test(l.lang)))c.add("lt-zh-wait");}catch(e){}
try{var rm=matchMedia("(prefers-reduced-motion: reduce)").matches;s.first=!rm&&!sessionStorage.getItem("lt-seen")&&!(location.hash.length>1);
if(s.first)c.add("lt-intro");else if(!rm&&window.CSS&&CSS.supports("animation-timeline: view()"))c.add("lt-push");
if(!rm&&matchMedia("(min-width: 1101px) and (min-height: 700px), (max-width: 700px), (min-height: 901px)").matches)c.add("lt-run-story");}catch(e){}
setTimeout(function(){if(s.playing!==true)c.remove("lt-intro");c.remove("lt-zh-wait");},4000);})();`;

const noChanges = () => () => {};

/** The inline script, only in the server HTML and while hydrating it. */
export function Prepaint() {
  const fromServer = useSyncExternalStore(noChanges, () => false, () => true);
  return fromServer ? <script dangerouslySetInnerHTML={{ __html: SCRIPT }} /> : null;
}

/** Runs the pre-paint code after a client-side navigation (the inline script never ran). */
export function applyPrepaint() {
  if (document.documentElement.classList.contains("lt-js")) return;
  const script = document.createElement("script");
  script.textContent = SCRIPT;
  document.head.appendChild(script).remove();
}
