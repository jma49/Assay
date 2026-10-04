"use client";

import { useRef } from "react";
import { gsap, MOTION, useGSAP } from "../motion";

/** Pulls its child a little towards a fine pointer, and springs back. Off with reduced motion and on touch. */
export function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(`${MOTION.full} and (pointer: fine)`, () => {
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: "power3.out" });
        };
        const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className="inline-flex">
      {children}
    </span>
  );
}
