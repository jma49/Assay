"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { canRunHeroShader, HERO_SHADER_MIN_WIDTH, readHeroPalette } from "../hero-light";
import { MOTION } from "../motion";

// The engine is large, so it loads only on browsers that will run it, and only once the hero's
// entrance and first scan are over: evaluating it is one ~150 ms task that would stutter them.
const LOAD_AFTER_MS = 4500;
const HeroShader = dynamic(() => import("./HeroShader"), { ssr: false });

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(MOTION.reduced), window.matchMedia(HERO_SHADER_MIN_WIDTH)];
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

function shaderAllowed() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return canRunHeroShader({
    reducedMotion: window.matchMedia(MOTION.reduced).matches,
    saveData: connection?.saveData === true,
    hasWebGpu: "gpu" in navigator,
    wideViewport: window.matchMedia(HERO_SHADER_MIN_WIDTH).matches,
  });
}

/** Mounts the WebGPU hero light when the browser can run it; the CSS light underneath stays until it is ready. */
export function HeroLight({ onLitChange }: { onLitChange: (lit: boolean) => void }) {
  const allowed = useSyncExternalStore(subscribe, shaderAllowed, () => false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let idle = 0;
    const timer = window.setTimeout(() => {
      // Safari has WebGPU but no requestIdleCallback.
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(() => setSettled(true), { timeout: 2000 });
      else setSettled(true);
    }, LOAD_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, []);

  if (!allowed || !settled) return null;
  const palette = readHeroPalette((token) => getComputedStyle(document.documentElement).getPropertyValue(token));
  return palette ? <HeroShader palette={palette} onLitChange={onLitChange} /> : null;
}
