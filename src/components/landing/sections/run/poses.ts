/**
 * The choreography's objects and their resting poses: film B, the lead tags, the SQL slip with its soft copy (the
 * rack-focus layer), the alert, and the light pulses at the registration marks and along the rows lit on both films.
 * Everything added here is removed by destroy().
 */
import type { gsap as Gsap } from "gsap";

export function createPoses(root: HTMLElement, gsap: typeof Gsap, desk: () => boolean) {
  const $ = (s: string) => root.querySelector<HTMLElement>(s)!;
  const $$ = (s: string, el: ParentNode = root) => [...el.querySelectorAll<HTMLElement>(s)];
  const filmB = $(".rf-b");
  const films = $(".run-films");
  const slip = $(".slip");
  const alertEl = $(".alert-msg");
  const lift = $(".alert-lift");
  const allTags = $$(".dtag");
  /* the lead tags are display:none below the desk layout: GSAP would measure each one by attaching it to <html>,
     which restyles the whole page in WebKit (a 60-80 ms frame per tag on a phone) */
  const tags = () => (desk() ? allTags : []);
  /** Poses the tags, if they are shown (GSAP warns about an empty target list). */
  const setTags = (on: boolean) => {
    const shown = tags();
    if (shown.length) gsap.set(shown, on ? pose.tag.show : pose.tag.hide);
  };
  const added: Element[] = [];
  const add = (parent: HTMLElement, className: string) => {
    const el = document.createElement("i");
    el.className = className;
    el.setAttribute("aria-hidden", "true");
    parent.appendChild(el);
    added.push(el);
    return el;
  };

  /* the rack-focus layer: a soft copy of the SQL under the sharp one */
  const sharp = $(".slip-sql");
  const soft = sharp.cloneNode(true) as HTMLElement;
  soft.classList.add("slip-soft");
  soft.setAttribute("aria-hidden", "true");
  soft.removeAttribute("aria-label");
  slip.appendChild(soft);
  added.push(soft);
  const sharpL = $$(".sl", sharp);
  const softL = $$(".sl", soft);
  const printB = $$(".rf-b .f-rows, .rf-b .f-head, .rf-b .f-lead > span");
  const placeSoft = () => {
    soft.style.left = `${sharp.offsetLeft}px`;
    soft.style.top = `${sharp.offsetTop}px`;
    soft.style.width = `${sharp.offsetWidth}px`;
  };
  const blurSlip = () => {
    gsap.set(soft, { autoAlpha: 1 });
    gsap.set(softL, { opacity: 1 });
    gsap.set(sharpL, { opacity: 0 });
  };

  /* light pulses: a ring at each registration mark, a flash along each row lit on both films (same row order) */
  const rowsA = $$(".rf-a .f-rows .r");
  const rowsB = $$(".rf-b .f-rows .r");
  const both = rowsA.filter((r, k) => r.classList.contains("lit") && rowsB[k]?.classList.contains("lit"));
  const regA = $$(".rf-a .reg");
  const regP = regA.map(() => add(films, "regpulse"));
  const rowP = both.map(() => add(films, "rpulse"));
  function placePulses() {
    const f = films.getBoundingClientRect();
    regP.forEach((pulse, k) => {
      const b = regA[k]!.getBoundingClientRect();
      pulse.style.left = `${b.left - f.left + b.width / 2}px`;
      pulse.style.top = `${b.top - f.top + b.height / 2}px`;
    });
    rowP.forEach((pulse, k) => {
      const b = both[k]!.getBoundingClientRect();
      Object.assign(pulse.style, { left: `${b.left - f.left + 5}px`, top: `${b.top - f.top}px`, width: `${b.width}px` });
    });
  }

  const pose = {
    slip: { hide: { autoAlpha: 0, x: 56, y: 6, rotation: 1.4 }, show: { autoAlpha: 1, x: 0, y: 0, rotation: 0 } },
    B: { hide: { autoAlpha: 0, x: -8, y: -150, rotation: -1.8 }, show: { autoAlpha: 1, x: 0, y: 0, rotation: 0 } },
    tag: { hide: { autoAlpha: 0, y: -16, rotation: -14 }, show: { autoAlpha: 1, y: 0, rotation: 0 } },
    // xPercent: 0 because GSAP reads a CSS translate of exactly half the width as xPercent -50
    alert: {
      hide: { autoAlpha: 0, xPercent: 0, x: -190, y: 56, scale: 0.86, rotation: -1.6, zIndex: 0 },
      show: { autoAlpha: 1, xPercent: 0, x: 0, y: 0, scale: 1, rotation: 0, zIndex: 3 },
    },
    // entering: wholly under film A (its own width to the left), opaque, so it slides out from under the film's edge
    alertUnder: () => ({ autoAlpha: 1, xPercent: 0, x: -(alertEl.offsetWidth + 60), y: 30, scale: 0.94, rotation: -1.2, zIndex: 0 }),
  };
  const kill = (...els: (HTMLElement | HTMLElement[])[]) => gsap.killTweensOf(els.flat());

  /** Poses for a step, set at once (the first arm mid-section, a width change, a remount). */
  function setPoses(i: number) {
    kill(filmB, printB, allTags, slip, alertEl, sharpL, softL, lift);
    gsap.set(filmB, i >= 2 ? pose.B.show : pose.B.hide);
    gsap.set(printB, { opacity: 1 });
    setTags(i >= 2);
    gsap.set(sharpL, { opacity: 1 });
    gsap.set(soft, { autoAlpha: 0 });
    if (!desk()) return;
    gsap.set(slip, i === 0 ? pose.slip.show : pose.slip.hide);
    gsap.set(alertEl, i === 3 ? pose.alert.show : pose.alert.hide);
    gsap.set(lift, { opacity: i === 3 ? 1 : 0 });
  }
  /** Before the film lands: the slip and the alert wait off the film; film B and the tags match the step. */
  function initial(i: number) {
    if (desk()) {
      gsap.set(slip, pose.slip.hide);
      gsap.set(alertEl, pose.alert.hide);
      gsap.set(lift, { opacity: 0 });
    }
    gsap.set(filmB, i >= 2 ? pose.B.show : pose.B.hide);
    setTags(i >= 2);
  }

  function destroy() {
    const touched = [filmB, slip, alertEl, lift, ...allTags, ...printB, ...sharpL];
    gsap.killTweensOf([...touched, ...added]);
    gsap.set(touched, { clearProps: "transform,opacity,visibility,zIndex" });
    added.forEach((el) => el.remove());
  }

  return { filmB, tags, lift, soft, sharpL, softL, printB, regP, rowP, pose, kill, add, placeSoft, placePulses, blurSlip, setPoses, initial, destroy };
}
