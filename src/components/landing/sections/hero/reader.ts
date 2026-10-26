/**
 * Reading the film (a fine pointer): hover runs a thin neutral line along the row under the pointer and prints the real
 * row on a lead tag, in the free gap between the two bands so it never covers a lit row's values. Only on the film at
 * rest: never during the switch-on, the push-in or the lift.
 */
import { describeRow, filmState, rowAt, type LedgerGeo } from "../../lib/film";
import { flags, type Language } from "../../lib/runtime";

export function startReader(film: HTMLElement, lang: Language) {
  const reader = film.querySelector<HTMLElement>(".reader");
  const line = reader?.querySelector<HTMLElement>(".reader-line");
  const tag = reader?.querySelector<HTMLElement>(".reader-tag");
  if (!reader || !line || !tag) return () => {};
  const ac = new AbortController();
  let px = 0;
  let py = 0;
  let raf = 0;
  function paint() {
    raf = 0;
    const hit = rowAt(film, px, py);
    if (!hit || flags.has("intro") || scrollY > 2) {
      reader!.classList.remove("is-on");
      return;
    }
    reader!.classList.add("is-on");
    line!.style.width = hit.w + "px";
    line!.style.transform = `translate(${hit.x}px, ${hit.y}px)`;
    tag!.innerHTML = describeRow(hit.id, lang);
    const W = film.offsetWidth;
    const state = filmState(film);
    const geo = state?.ledger ? (state.geo as LedgerGeo) : undefined;
    const pad = geo ? geo.pad : 8;
    tag!.style.maxWidth = W - 2 * pad + "px";
    const tw = tag!.offsetWidth;
    const th = tag!.offsetHeight;
    // inside the film, beside the pointer
    const tx = Math.min(Math.max(pad, px - tw / 2), W - pad - tw);
    // in the free gap: the compressed band of rows that were not returned, never over a lit row's values
    let ty: number;
    if (geo && geo.mid >= th + 8) {
      const lo = geo.midY + 4;
      const hi = geo.midY + geo.mid - th - 4;
      ty = hit.y < geo.midY ? lo : hit.y >= geo.botY ? hi : Math.min(hi, Math.max(lo, hit.y - th - 10));
    } else {
      ty = hit.y - th - 8;
      if (ty < 4) ty = hit.y + 10;
    }
    tag!.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`;
  }
  addEventListener("scroll", () => reader.classList.contains("is-on") && reader.classList.remove("is-on"), { passive: true, signal: ac.signal });
  film.addEventListener(
    "pointermove",
    (e) => {
      const r = film.getBoundingClientRect();
      px = (e.clientX - r.left) * (film.offsetWidth / r.width);
      py = (e.clientY - r.top) * (film.offsetHeight / r.height);
      if (!raf) raf = requestAnimationFrame(paint);
    },
    { signal: ac.signal },
  );
  film.addEventListener("pointerleave", () => reader.classList.remove("is-on"), { signal: ac.signal });
  return () => {
    ac.abort();
    cancelAnimationFrame(raf);
    reader.classList.remove("is-on");
    tag.textContent = "";
    line.removeAttribute("style");
    tag.removeAttribute("style");
  };
}
