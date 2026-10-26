/**
 * The run's physical choreography (GSAP), on top of the class-driven CSS story: film A slides up onto the clips as the
 * section scrolls in, the clips clack, the SQL slip racks focus onto WHERE, a read head lights the returned rows, film
 * B is lowered, hangs out of register and snaps into it (its print reads double for under a tenth of a second) with a
 * pulse through the rows lit on both, the lead tags drop on their strings, and the alert slides out from under the
 * film and leaves the box. A step change is sequenced: the outgoing object leaves (180 ms), then the next one enters.
 */
import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import { createPoses } from "./poses";

export interface Choreo {
  play: (step: number, prev: number) => void;
  kill: () => void;
}

interface Options {
  current: () => number;
  /** A remount after a language switch: show the step as it stands, replay nothing. */
  settled: boolean;
  memo: { armed?: boolean; developed?: boolean };
}

const AFTER = 0.2;
/** WHERE first, then the lines around it */
const FOCUS_ORDER = [3, 2, 4, 1, 0] as const;

export function choreograph(root: HTMLElement, gsap: typeof Gsap, ScrollTrigger: typeof ScrollTriggerType, { current, settled, memo }: Options): Choreo {
  const $ = (s: string) => root.querySelector<HTMLElement>(s)!;
  const $$ = (s: string, el: ParentNode = root) => [...el.querySelectorAll<HTMLElement>(s)];
  const ac = new AbortController();
  const signal = ac.signal;
  const stage = $(".run-stage");
  const films = $(".run-films");
  const filmA = $(".rf-a");
  const slip = $(".slip");
  const alertEl = $(".alert-msg");
  const clips = $$(".rclip");
  const covers = $$(".rf-a .cover");
  const narrow = matchMedia("(max-width: 1100px)");
  const desk = () => !narrow.matches;
  const P = createPoses(root, gsap, desk);
  const { filmB, tags, lift, sharpL, softL, soft, printB, pose, kill } = P;
  root.classList.add("is-gsap");

  /* the read head passes down each column; a returned row lights the moment it passes (CSS delay = --k × 180 ms) */
  const rowsA = $$(".rf-a .f-rows .r");
  const scan = P.add(filmA, "scan");
  const perCol = () => (matchMedia("(max-width: 700px)").matches ? 20 : 30);
  const colDur = () => (perCol() === 20 ? 0.6 : 0.8);
  function timeLights() {
    const n = perCol();
    const d = colDur();
    rowsA.forEach((r, k) => {
      if (r.classList.contains("lit")) r.style.setProperty("--k", String(((Math.floor(k / n) + ((k % n) + 0.5) / n) * d) / 0.18));
    });
  }
  timeLights();
  addEventListener("resize", timeLights, { signal });
  function scanDown() {
    kill(scan);
    const n = perCol();
    const tl = gsap.timeline();
    for (let c = 0; c * n < rowsA.length; c++) {
      const a = rowsA[c * n]!;
      const z = rowsA[Math.min(rowsA.length, (c + 1) * n) - 1]!;
      tl.set(scan, { left: a.offsetLeft - 4, width: a.offsetWidth + 8, y: a.offsetTop, autoAlpha: 1 }).to(scan, {
        y: z.offsetTop + z.offsetHeight,
        duration: colDur(),
        ease: "none",
      });
    }
    tl.to(scan, { autoAlpha: 0, duration: 0.2 });
  }

  /** brings SQL line n into focus: the sharp line comes up over its soft copy */
  const sharpen = (tl: ReturnType<typeof gsap.timeline>, n: number, at: number, duration: number, ease: string) => {
    const line = sharpL[n];
    const blur = softL[n];
    if (line && blur) tl.to(line, { opacity: 1, duration, ease }, at).to(blur, { opacity: 0, duration }, at);
  };
  function slipIn() {
    kill(slip, sharpL, softL);
    P.placeSoft();
    const tl = gsap.timeline({ delay: AFTER });
    tl.fromTo(slip, pose.slip.hide, { ...pose.slip.show, duration: 0.9, ease: "settle" }, 0);
    // rack focus: the whole slip soft, then WHERE comes sharp, then the lines around it
    tl.set(soft, { autoAlpha: 1 }, 0).set(softL, { opacity: 1 }, 0).set(sharpL, { opacity: 0 }, 0);
    sharpen(tl, FOCUS_ORDER[0], 0.55, 0.45, "power2.out");
    FOCUS_ORDER.slice(1).forEach((n, k) => sharpen(tl, n, 1.25 + k * 0.08, 0.5, "power1.out"));
    tl.set(soft, { autoAlpha: 0 });
  }
  function focusPull() {
    kill(sharpL, softL);
    const tl = gsap.timeline();
    sharpen(tl, FOCUS_ORDER[0], 0.05, 0.4, "power2.out");
    FOCUS_ORDER.slice(1).forEach((n, k) => sharpen(tl, n, 0.5 + k * 0.08, 0.45, "power1.out"));
    tl.set(soft, { autoAlpha: 0 });
  }
  const slipOut = () => {
    kill(slip, sharpL, softL);
    gsap.set(sharpL, { opacity: 1 });
    gsap.set(soft, { autoAlpha: 0 });
    gsap.to(slip, { ...pose.slip.hide, duration: 0.18, ease: "power2.in" });
  };

  /* film B is lowered with its print held back (only its crosshairs show, apart from film A's); the print comes up as
     it snaps, so the rows read double for under a tenth of a second, then sit in register */
  const diffRows = $$(".rd-diff li");
  function register() {
    kill(filmB, tags(), clips, films, P.regP, P.rowP, printB, diffRows);
    P.placePulses();
    const shownTags = tags();
    const tl = gsap
      .timeline()
      .set(printB, { opacity: 0 }, 0)
      .to(clips, { y: -7, rotation: (k: number) => (k ? 5 : -5), duration: 0.22, ease: "power2.out" }, 0)
      .fromTo(filmB, pose.B.hide, { autoAlpha: 1, duration: 0.18, ease: "none" }, 0.05)
      .to(filmB, { x: 6, y: -8, rotation: -0.3, duration: 0.6, ease: "settle" }, 0.05)
      .to(printB, { opacity: 1, duration: 0.04, ease: "none" }, 0.66)
      .to(filmB, { x: 0, y: 0, rotation: 0, duration: 0.08, ease: "power4.in" }, 0.66)
      .addLabel("snap")
      .to(clips, { y: 0, rotation: 0, duration: 0.34, ease: "back.out(5)" }, "snap")
      .fromTo(films, { y: 2 }, { y: 0, duration: 0.3, ease: "power2.out", immediateRender: false }, "snap")
      .fromTo(P.regP, { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 3.4, duration: 0.8, ease: "power2.out" }, "snap")
      .fromTo(P.rowP, { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power2.out", stagger: 0.07 }, "snap")
      .to(P.rowP, { autoAlpha: 0, duration: 0.6, ease: "power1.out", stagger: 0.07 }, "snap+=0.3")
      .fromTo(diffRows, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "settle", stagger: 0.1 }, "snap+=0.1");
    if (shownTags.length) {
      tl.set(shownTags, pose.tag.hide, 0).fromTo(shownTags, pose.tag.hide, { ...pose.tag.show, duration: 1.1, ease: "elastic.out(1, 0.42)", stagger: 0.12 }, "snap+=0.25");
    }
  }
  const unregister = () => {
    kill(filmB, tags());
    if (tags().length) gsap.to(tags(), { ...pose.tag.hide, duration: 0.2 });
    gsap.to(filmB, { ...pose.B.hide, duration: 0.55, ease: "power2.in" });
  };

  const alertParts = $$(".alert-title, .alert-lines > span, .abtn", alertEl);
  function alertIn() {
    kill(alertEl, lift);
    // printed and opaque from the start, under the film: it slides out from under the film's edge once step 3's
    // readings have left (no card is ever shown empty, nothing is half transparent over something else)
    gsap.set(alertParts, { clearProps: "opacity,visibility,transform" });
    gsap
      .timeline({ delay: AFTER })
      .set(alertEl, pose.alertUnder(), 0)
      .to(alertEl, { x: 0, y: 0, scale: 1, rotation: 0, duration: 1.0, ease: "settle" }, 0)
      .set(alertEl, { zIndex: 3 }, 0.6)
      .fromTo(lift, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.out" }, 0.3);
  }
  const alertOut = () => {
    kill(alertEl, lift);
    gsap.to(lift, { opacity: 0, duration: 0.15 });
    gsap.set(alertEl, { zIndex: 0 });
    gsap.to(alertEl, { ...pose.alertUnder(), duration: 0.18, ease: "power2.in", onComplete: () => void gsap.set(alertEl, { autoAlpha: 0 }) });
  };

  let armed = false;
  let rode = false;
  const tableRows = $$(".rd-table tbody tr");
  function play(i: number, prev: number) {
    if (!armed) return;
    if (prev === -1) return P.setPoses(i);
    if (i >= 2 && prev < 2) register();
    else if (i < 2 && prev >= 2) unregister();
    if (i === 1 && prev < 1) {
      scanDown();
      // the readings table is display:none below the desk layout (see the tags in poses.ts)
      if (desk()) gsap.fromTo(tableRows, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "settle", stagger: 0.18, delay: 0.15 });
    }
    if (!desk()) return;
    if (i === 0) slipIn();
    else if (prev === 0) slipOut();
    if (i === 3) alertIn();
    else if (prev === 3) alertOut();
  }

  /* the film lands on the clips: they clack and it is developed */
  function arm() {
    if (armed) return;
    armed = true;
    stage.classList.add("is-developed");
    memo.developed = true;
    gsap.set(covers, { clearProps: "transform" });
    const step = current();
    const rodeIn = rode && step === 0 && desk();
    rode = false;
    P.setPoses(step);
    if (rodeIn) {
      P.blurSlip();
      focusPull();
    }
    if (settled && memo.armed) return;
    memo.armed = true;
    gsap
      .timeline()
      .fromTo(clips, { y: -6 }, { y: 0, duration: 0.32, ease: "back.out(5)" }, 0)
      .fromTo(films, { y: 2 }, { y: 0, duration: 0.3, ease: "power2.out", immediateRender: false }, 0);
    if (step === 0 && desk() && !rodeIn) slipIn();
  }
  P.initial(current());
  if (desk()) root.classList.add("is-gsap-desk");

  /* the hand-off from the hero: film A rides up in its clips (they travel with it) and its read head develops it band
     by band while it moves, so it lands developed; on desktop the step-1 SQL slip rides in on the right in the same
     move, out of focus, and racks into focus as the film lands */
  const entryDone = () => root.getBoundingClientRect().top <= (desk() ? 0 : innerHeight * 0.08);
  const ride = !entryDone();
  const entry = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: root, start: "top bottom", end: () => (desk() ? "top top" : "top 8%"), scrub: 0.7, invalidateOnRefresh: true, onLeave: arm },
  });
  entry.fromTo([filmA, ...clips], { y: () => innerHeight * 0.42, x: 26, rotation: 2.4 }, { y: 0, x: 0, rotation: 0, duration: 1 }, 0);
  if (ride && !stage.classList.contains("is-developed")) {
    // the read head: each band's cover is wiped off in turn over the second half of the ride
    covers.forEach((c, k) => {
      entry.fromTo(c, { scaleX: 1 }, { scaleX: 0, duration: 0.16, ease: "power1.inOut" }, 0.38 + k * (0.42 / covers.length));
    });
  }
  if (desk() && ride && current() === 0) {
    P.placeSoft();
    P.blurSlip();
    entry.fromTo(slip, { autoAlpha: 1, x: 90, y: () => innerHeight * 0.3, rotation: 1.6 }, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 1 }, 0);
    rode = true;
  }
  if (settled && !ride) arm();
  const frame = requestAnimationFrame(() => {
    if ((entry.scrollTrigger?.progress ?? 0) >= 1) arm();
  });

  // decode the box's face and frame now, so the first frame of the pull back does not wait on them
  for (const file of ["box-opal-d.webp", "box-frame.webp"]) {
    const image = new Image();
    image.src = `/landing/run/${file}`;
    image.decode?.().catch(() => {});
  }
  /* the box: its frame comes into view (a short pull back from the face) while the story is pinned */
  const pin = $(".run-pin");
  const box = ScrollTrigger.create({ trigger: root, start: "top 4px", end: "bottom top", toggleClass: { targets: pin, className: "is-boxed" } });

  /* exit (desktop): the alert is the one object that leaves the room, rising off the box as it dims toward the lead */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 1101px)", () => {
    const scrollTrigger = { trigger: root, start: "bottom bottom", end: "bottom 35%", scrub: 0.5 };
    gsap.fromTo(alertEl, { yPercent: 0 }, { yPercent: -70, ease: "none", immediateRender: false, scrollTrigger });
    gsap.fromTo($(".run-dim"), { opacity: 0 }, { opacity: 0.9, ease: "power1.inOut", immediateRender: false, scrollTrigger: { ...scrollTrigger } });
  });

  narrow.addEventListener(
    "change",
    () => {
      root.classList.toggle("is-gsap-desk", desk());
      gsap.set([slip, alertEl], { clearProps: "transform,opacity,visibility,zIndex" });
      if (desk()) P.setPoses(current());
    },
    { signal },
  );

  return {
    play,
    kill: () => {
      ac.abort();
      cancelAnimationFrame(frame);
      mm.revert();
      box.kill();
      entry.scrollTrigger?.kill();
      entry.kill();
      pin.classList.remove("is-boxed");
      const touched = [filmA, films, slip, alertEl, ...clips, ...covers, ...diffRows, ...tableRows, ...alertParts, $(".run-dim")];
      kill(touched);
      gsap.set(touched, { clearProps: "transform,opacity,visibility,zIndex" });
      // back to the CSS story's timing: the returned rows light one after another
      rowsA.filter((r) => r.classList.contains("lit")).forEach((r, k) => r.style.setProperty("--k", String(k)));
      P.destroy();
      root.classList.remove("is-gsap", "is-gsap-desk");
    },
  };
}
