/**
 * The light table's motion kit: film grain over a ground. Transform only, nothing runs
 * off screen, static under reduced motion. Styles: styles/kit.css. Seams and house lights are CSS (styles/base.css).
 *
 *   grain(target, { opacity, fps }) -> { el, stop }     one 160 px tile, stepped by transform (fps 0: static)
 */
import { env, whileVisible } from "./runtime";

/* ---------- grain: film emulsion over a ground ---------- */
let tile: string | null = null;
function grainTile() {
  if (tile) return tile;
  const n = 160;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(n, n);
  let s = 20261025;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n * n; i++) {
    // clumped silver: most pixels clear, a few dark or bright specks, softly sized
    const v = rnd() < 0.5 ? 0 : 255;
    const a = Math.pow(rnd(), 3.2) * 120;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = a;
  }
  g.putImageData(img, 0, 0);
  return (tile = canvas.toDataURL("image/png"));
}

/** Appends a grain layer to target (positioned). fps 0 is a static layer (no oversized tile, no loop). */
export function grain(target: HTMLElement, { opacity = 0.05, fps = 8 } = {}) {
  const el = document.createElement("div");
  el.className = fps ? "lt-grain" : "lt-grain is-static";
  el.setAttribute("aria-hidden", "true");
  el.style.setProperty("--grain", `url(${grainTile()})`);
  el.style.opacity = String(opacity);
  target.appendChild(el);
  if (env.reduced || !fps) return { el, stop: () => el.remove() };
  // the tile jumps to a new offset a few times a second: grain lives, nothing is repainted
  const steps = 9;
  const frames: Keyframe[] = [];
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < steps; i++) frames.push({ transform: `translate(${Math.round(rnd() * 140 - 70)}px, ${Math.round(rnd() * 140 - 70)}px)` });
  const a = el.animate(frames, { duration: (steps / fps) * 1000, iterations: Infinity, easing: `steps(${steps}, jump-none)` });
  a.pause();
  const stopVisible = whileVisible(target, () => a.play(), () => a.pause());
  return {
    el,
    stop() {
      stopVisible();
      a.cancel();
      el.remove();
    },
  };
}
