/**
 * The live hero box's camera and the DOM it carries. The camera follows the CSS push's path (the film's centre to the
 * viewport's centre, the film's height filling the frame), plus a swing round the box that is zero at both ends. The film
 * and the clips stay the crisp DOM ones, carried on their 3D planes by a projective (matrix3d) transform; as the clips
 * let go the film is lifted off the opal and its contact shadow trails behind it. On a fine pointer at rest the film and
 * the clips part from the opal by a few px with a damped spring (the visitor's eye).
 */
import * as THREE from "three";
import type { Built } from "./gl-build";
import { DEPTH, L } from "./gl-build";
import { isDesk } from "./gl";
import { quadMatrix } from "./gl-shaders";
import { E, map } from "./timing";

const ZF = DEPTH + 0.003; // the film lies on the opal
const ZC = DEPTH + 0.02; // the clips stand proud of it
// the swing at the middle of the push: the camera passes to the left of the box and a little above it
const SWING = { yaw: -0.33, pitch: 0.1 };
const EYE = { fx: 8, fy: 5, cx: 13, cy: 8 }; // px at the edge of the screen: film, clips
// the CSS lift (hero.css @keyframes lt-lift: 0 -> -3 % at 10 % -> -106 %), as a fraction of the film's height
const liftOf = (t: number) => (t <= 0.1 ? 0.3 * t : 0.03 + (t - 0.1) * (1.03 / 0.9));

export interface RigDom {
  stage: HTMLElement;
  pin: HTMLElement;
  film: HTMLElement;
  clipsBox: HTMLElement | null;
  clipEls: HTMLElement[];
}

export function createRig(b: Built, dom: RigDom, renderer: THREE.WebGLRenderer) {
  const { restCam, camera, uRest, fillMat, shadow, shadowMat } = b;
  const { stage, pin, film, clipsBox, clipEls } = dom;
  const G = { SW: 0, SH: 0, aspect: 1, t: 0, w: 0, h: 0, left: 0, top: 0, x0: 0, x1: 0, y0: 0, y1: 0, cx: 0, cy: 0, s: 1, n0: [0, 0], n1: [0, 0], hwc: 0, hhc: 0, px: 0, clips: [] as number[][] };
  const ptr = { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, rest: true };
  const DPR = window.devicePixelRatio || 1;

  /** The stage, the film's rectangle on the film plane and the push's end frame, from the page's layout. */
  function measure() {
    const SW = stage.offsetWidth;
    const SH = stage.offsetHeight;
    const aspect = SW / SH;
    for (const c of [restCam, camera]) {
      c.aspect = aspect;
      c.updateProjectionMatrix();
    }
    restCam.position.set(0, 0, L.camZ);
    restCam.lookAt(0, 0, 0);
    restCam.updateMatrixWorld();
    uRest.multiplyMatrices(restCam.projectionMatrix, restCam.matrixWorldInverse);
    const t = Math.tan((L.fov * Math.PI) / 360);
    const hh = t * (L.camZ - ZF);
    const hw = hh * aspect;
    const w = film.offsetWidth;
    const h = film.offsetHeight;
    const left = film.offsetLeft;
    const top = film.offsetTop;
    const x0 = ((left / SW) * 2 - 1) * hw;
    const x1 = (((left + w) / SW) * 2 - 1) * hw;
    const y0 = (1 - (top / SH) * 2) * hh;
    const y1 = (1 - ((top + h) / SH) * 2) * hh;
    const sr = stage.getBoundingClientRect();
    const pr = pin.getBoundingClientRect();
    // the scale the CSS push comes to rest at (hero.motion.ts placePush): the film's height fills the frame
    const s = Math.min((pr.height * 0.94) / h, (pr.width * 0.9) / w);
    const vx = pr.width / 2 - (sr.left - pr.left);
    const vy = pr.height / 2 - (sr.top - pr.top);
    const hhc = t * (L.camZ - ZC);
    Object.assign(G, {
      SW, SH, aspect, t, w, h, left, top, x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, s,
      n0: [(x0 + x1) / 2 / hw, (y0 + y1) / 2 / hh], n1: [(vx / SW) * 2 - 1, 1 - (vy / SH) * 2], hwc: hhc * aspect, hhc,
      clips: clipEls.map((el) => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight]),
      px: (2 * t * (L.camZ - DEPTH)) / SH, // one stage px on the opal, in world units
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(SW, SH, false);
  }

  /** The eye's damped spring toward the pointer (at rest only); true while it still moves. */
  function stepPointer(now: number, p: number) {
    const k = isDesk() ? 1 - map(p, 0, 0.05) : 0;
    const dt = ptr.t ? Math.min(0.05, (now - ptr.t) / 1000) : 1 / 60;
    ptr.t = now;
    const w = 2 * Math.PI * 1.4;
    const z = 0.6;
    for (const a of ["x", "y"] as const) {
      const T = (a === "x" ? ptr.tx : ptr.ty) * k;
      const va = a === "x" ? "vx" : "vy";
      ptr[va] += (w * w * (T - ptr[a]) - 2 * z * w * ptr[va]) * dt;
      ptr[a] += ptr[va] * dt;
    }
    const busy = Math.abs(ptr.tx * k - ptr.x) + Math.abs(ptr.ty * k - ptr.y) > 0.002 || Math.abs(ptr.vx) + Math.abs(ptr.vy) > 0.01;
    if (!busy) Object.assign(ptr, { x: ptr.tx * k, y: ptr.ty * k, vx: 0, vy: 0, t: 0 });
    ptr.rest = !busy;
    return busy;
  }

  // kS: the dolly (scale G.s^kS), kP: where the film's centre sits on screen, sw: how much of the swing is on. On the
  // camera's own path all three follow k; at a mid-push takeover they start on the CSS push and blend into it (mix).
  function placeCamera(k: number, kS = k, kP = k, sw = 1) {
    const s = Math.pow(G.s, kS);
    const D = (L.camZ - ZF) / s;
    const hh = G.t * D;
    const hw = hh * G.aspect;
    const nx = G.n0[0]! + (G.n1[0]! - G.n0[0]!) * kP;
    const ny = G.n0[1]! + (G.n1[1]! - G.n0[1]!) * kP;
    const lx = G.cx - nx * hw;
    const ly = G.cy - ny * hh; // the point of the film plane at the centre of the frame
    const sb = Math.pow(Math.sin(Math.PI * k), 2) * sw;
    const yaw = SWING.yaw * sb;
    const pitch = SWING.pitch * sb;
    camera.position.set(lx + D * Math.sin(yaw) * Math.cos(pitch), ly + D * Math.sin(pitch), ZF + D * Math.cos(yaw) * Math.cos(pitch));
    camera.up.set(0, 1, 0);
    camera.lookAt(lx, ly, ZF);
    camera.updateMatrixWorld();
  }
  const v3 = new THREE.Vector3();
  const toStage = (x: number, y: number, z: number): [number, number] => {
    v3.set(x, y, z).project(camera);
    return [((v3.x + 1) / 2) * G.SW, ((1 - v3.y) / 2) * G.SH];
  };

  function clearOverlay() {
    film.style.transform = "";
    film.style.transformOrigin = "";
    if (clipsBox) clipsBox.style.opacity = "";
    clipEls.forEach((c) => {
      c.style.transform = "";
      c.style.transformOrigin = "";
    });
  }

  /** One frame of the scroll story at progress p; carry: the live box has taken over (it carries the DOM film and clips). */
  function apply(p: number, carry: boolean, mix: number) {
    const q = map(p, 0, 0.48);
    const k = E.glide(q);
    if (mix >= 1) placeCamera(k);
    else {
      // the CSS push at this scroll position: scale 1 + (s - 1) q about the film's centre, the centre moved linearly
      const kSc = Math.log(1 + (G.s - 1) * q) / Math.log(G.s);
      const m = mix * mix * (3 - 2 * mix);
      placeCamera(k, kSc + (k - kSc) * m, q + (k - q) * m, m);
    }
    const lift = map(p, 0.56, 1);
    const fh = G.y0 - G.y1;
    const dy = liftOf(lift) * fh;
    const offOpal = E.glide(Math.min(1, lift * 1.8)); // how far the film has come off the opal
    const zf = ZF + 0.045 * offOpal; // pulled toward the viewer as well as up: it grows a little over its own shadow
    // the eye's offsets (px); settled offsets land on device pixels, so the print stays crisp
    const snap = (v: number) => (ptr.rest ? Math.round(v * DPR) / DPR : v);
    const fdx = snap(-ptr.x * EYE.fx);
    const fdy = snap(-ptr.y * EYE.fy);
    const cdx = snap(-ptr.x * EYE.cx);
    const cdy = snap(-ptr.y * EYE.cy);
    const eye = Math.abs(fdx) + Math.abs(fdy) + Math.abs(cdx) + Math.abs(cdy) > 0.01;
    // the film and the clips: the DOM ones, carried on their planes (identity at rest, so the reading line is exact);
    // before the takeover the CSS push moves the DOM
    if (carry && p <= 0 && !eye) clearOverlay();
    else if (carry && p <= 0) {
      film.style.transformOrigin = "0 0";
      film.style.transform = `translate(${fdx}px, ${fdy}px)`;
      clipEls.forEach((el) => {
        el.style.transformOrigin = "0 0";
        el.style.transform = `translate(${cdx}px, ${cdy}px)`;
      });
      if (clipsBox) clipsBox.style.opacity = "";
    } else if (carry) {
      const P = [toStage(G.x0, G.y0 + dy, zf), toStage(G.x1, G.y0 + dy, zf), toStage(G.x1, G.y1 + dy, zf), toStage(G.x0, G.y1 + dy, zf)].map(
        ([x, y]): [number, number] => [x - G.left + fdx, y - G.top + fdy],
      );
      film.style.transformOrigin = "0 0";
      film.style.transform = quadMatrix(G.w, G.h, P);
      // each clip on its own plane, a little in front of the film (one small layer each: WebKit mis-draws a stage-sized
      // layer under a projective transform)
      const onC = (px: number, py: number) => toStage(((px / G.SW) * 2 - 1) * G.hwc, (1 - (py / G.SH) * 2) * G.hhc, ZC);
      clipEls.forEach((el, i) => {
        const [l, t, w, h] = G.clips[i] as [number, number, number, number];
        const C = [onC(l, t), onC(l + w, t), onC(l + w, t + h), onC(l, t + h)].map(([x, y]): [number, number] => [x - l + cdx, y - t + cdy]);
        el.style.transformOrigin = "0 0";
        el.style.transform = quadMatrix(w, h, C);
      });
      if (clipsBox) clipsBox.style.opacity = String(1 - map(p, 0.52, 0.6));
    }
    // the room and the frame give way to the plain lit face (the poster path's .cam-face, same range)
    fillMat.uniforms.uA!.value = map(p, 0.54, 0.74);
    // the clips let go, the film comes off the opal: its contact shadow appears, trails behind it and fades
    const sa = 0.36 * map(p, 0.53, 0.6) * (1 - map(p, 0.7, 0.96));
    shadow.visible = sa > 0.002;
    const u = shadowMat.uniforms;
    if (!shadow.visible && eye && p < 0.05) {
      // at rest the film's shadow lies exactly under it (so the rest frame is the poster); the eye's offset uncovers it
      shadow.visible = true;
      const blur = 4.5 * G.px;
      const pad = blur * 2.5;
      u.uSize!.value.set(G.x1 - G.x0 - 2 * blur - 2 * G.px, G.y0 - G.y1 - 2 * blur - 2 * G.px);
      u.uBlur!.value = blur;
      u.uPad!.value = pad;
      u.uA!.value = 0.58;
      shadow.scale.set(u.uSize!.value.x + 2 * pad, u.uSize!.value.y + 2 * pad, 1);
      shadow.position.set(G.cx, G.cy, DEPTH + 0.002);
    } else if (shadow.visible) {
      const blur = 0.006 + 0.03 * offOpal;
      const pad = blur * 2.5;
      u.uSize!.value.set((G.x1 - G.x0) * (1 + 0.03 * offOpal), fh * (1 + 0.03 * offOpal));
      u.uBlur!.value = blur;
      u.uPad!.value = pad;
      u.uA!.value = sa;
      shadow.scale.set(u.uSize!.value.x + 2 * pad, u.uSize!.value.y + 2 * pad, 1);
      // the room light comes from the upper left: the shadow falls down and to the right, and trails the lift
      shadow.position.set(G.cx + 0.004 + 0.012 * offOpal, G.cy + dy - fh * (0.012 + 0.1 * offOpal), DEPTH + 0.002);
    }
  }

  return { ptr, measure, stepPointer, apply, clearOverlay };
}
