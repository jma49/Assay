/**
 * WebKit has no canvas `filter`: the hero film's halos (blur(...) fills in lib/film.ts) were drawn as hard-edged
 * rectangles in Safari. For canvases inside the hero film only, a blurred fillRect is drawn as its own shadow (the shape
 * itself off the canvas); save/restore keep the filter state as the real one does. Installed once per page; a no-op where
 * the context has `filter`.
 */
type Ctx = CanvasRenderingContext2D;
let installed = false;

export function installWebkitBlur() {
  if (installed || typeof CanvasRenderingContext2D === "undefined" || Reflect.has(CanvasRenderingContext2D.prototype, "filter")) return;
  installed = true;
  const P: Ctx = CanvasRenderingContext2D.prototype;
  const fill = P.fillRect;
  const save = P.save;
  const restore = P.restore;
  const cur = new WeakMap<Ctx, string>();
  const stack = new WeakMap<Ctx, (string | undefined)[]>();
  Object.defineProperty(P, "filter", {
    configurable: true,
    get(this: Ctx) {
      return cur.get(this) || "none";
    },
    set(this: Ctx, v: string) {
      cur.set(this, String(v));
    },
  });
  P.save = function (this: Ctx) {
    const s = stack.get(this) || [];
    s.push(cur.get(this));
    stack.set(this, s);
    return save.call(this);
  };
  P.restore = function (this: Ctx) {
    const s = stack.get(this);
    if (s && s.length) cur.set(this, s.pop() ?? "none");
    return restore.call(this);
  };
  P.fillRect = function (this: Ctx, x: number, y: number, w: number, h: number) {
    const m = /blur\(([\d.]+)px\)/.exec(cur.get(this) || "");
    if (!m || typeof this.fillStyle !== "string" || !(this.canvas instanceof HTMLCanvasElement) || !this.canvas.closest(".film-hero")) return fill.call(this, x, y, w, h);
    // WebKit's shadow spreads wider and fainter than a canvas blur of the same σ: a tighter shadow drawn three times
    // matches Chromium's halo within about 10 % at DPR 2
    const k = this.getTransform().a;
    const off = 20000;
    save.call(this);
    this.shadowColor = this.fillStyle;
    this.shadowBlur = 0.9 * +m[1]! * k;
    this.shadowOffsetX = off * k;
    this.shadowOffsetY = 0;
    for (let i = 0; i < 3; i++) fill.call(this, x - off, y, w, h);
    restore.call(this);
  };
}
