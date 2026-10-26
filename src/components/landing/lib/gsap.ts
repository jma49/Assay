/**
 * GSAP for the motion modules: `need(...plugins)` imports the named plugins once (each its own chunk), registers
 * them and the four curves as eases ("settle", "glide", "develop", "snap"), and resolves with gsap and the plugins.
 *
 *   const { gsap, ScrollTrigger } = await need("ScrollTrigger");
 *   gsap.to(el, { y: 0, ease: "settle" });
 *
 * Import this module only from motion modules (they are loaded after hydration), so GSAP is never on the critical path.
 */
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import type { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, lifetime } from "./runtime";

interface Plugins {
  ScrollTrigger: typeof ScrollTrigger;
  DrawSVGPlugin: typeof DrawSVGPlugin;
  CustomEase: typeof CustomEase;
}
export type PluginName = keyof Plugins;

const loaders: { [N in PluginName]: () => Promise<Plugins[N]> } = {
  ScrollTrigger: () => import("gsap/ScrollTrigger").then((m) => m.ScrollTrigger),
  DrawSVGPlugin: () => import("gsap/DrawSVGPlugin").then((m) => m.DrawSVGPlugin),
  CustomEase: () => Promise.resolve(CustomEase),
};

const loaded: Partial<Plugins> = {};
const pending = new Map<PluginName, Promise<unknown>>();
let eased = false;

function registerEases() {
  if (eased) return;
  eased = true;
  gsap.registerPlugin(CustomEase);
  for (const [name, curve] of Object.entries(EASE)) CustomEase.create(name, curve.replace(/^cubic-bezier\(|\)$/g, ""));
}

/**
 * ScrollTrigger lives while the landing is mounted: leaving the page kills every trigger and disables the plugin;
 * the next need("ScrollTrigger") enables it again.
 */
let installed = false;

function installScrollTrigger(plugin: Plugins["ScrollTrigger"], first: boolean) {
  installed = true;
  const ac = new AbortController();
  // a module whose section changed height (lib/runtime.ts relayout()): every trigger below it measures again
  document.addEventListener("lt:relayout", () => plugin.refresh(), { signal: ac.signal });
  if (first) gsap.registerPlugin(plugin);
  else plugin.enable();
  lifetime.onLeave(() => {
    ac.abort();
    plugin.killAll();
    plugin.disable();
    installed = false;
  });
}

async function load<N extends PluginName>(name: N): Promise<void> {
  if (loaded[name]) return;
  let promise = pending.get(name);
  if (!promise) {
    promise = loaders[name]().then((plugin) => {
      if (name === "ScrollTrigger") installScrollTrigger(plugin as Plugins["ScrollTrigger"], true);
      else gsap.registerPlugin(plugin as object);
      (loaded as Record<string, unknown>)[name] = plugin;
    });
    pending.set(name, promise);
  }
  await promise;
}

/** Imports and registers the named plugins (once each) and resolves with gsap and them. */
export async function need<N extends PluginName>(...names: N[]): Promise<{ gsap: typeof gsap } & Pick<Plugins, N>> {
  registerEases();
  await Promise.all(names.map(load));
  // back on the landing after a client-side navigation away from it
  if (loaded.ScrollTrigger && !installed && lifetime.present) installScrollTrigger(loaded.ScrollTrigger, false);
  const out = { gsap } as { gsap: typeof gsap } & Pick<Plugins, N>;
  for (const name of names) (out as Record<string, unknown>)[name] = loaded[name];
  return out;
}

export { gsap };
