"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

/**
 * Reduced motion turns off large movement (pinning, 3D tilt, drifting, sliding, scaling) but keeps
 * fades, typing, counters and the scan line, which do not move the page.
 */
export const MOTION = { full: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" } as const;
