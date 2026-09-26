import { useId } from "react";

/**
 * Desktop picture in the spirit of early Mac OS X: deep Aqua blue with soft,
 * glowing swooshes. Original artwork drawn as inline SVG, so it costs no
 * image download and stays sharp at any size.
 */

const WIDTH = 1600;
const HEIGHT = 900;

// Each swoosh is a ribbon between two curves that sweep across the picture.
const SWOOSHES = [
  {
    d: "M -100 640 C 300 520, 620 470, 1000 520 S 1500 640, 1700 560 L 1700 610 C 1480 700, 1250 620, 1000 580 S 320 590, -100 720 Z",
    opacity: 0.55,
    blur: 18,
  },
  {
    d: "M -100 520 C 260 430, 700 360, 1080 420 S 1560 520, 1700 460 L 1700 480 C 1520 560, 1300 470, 1080 450 S 380 450, -100 560 Z",
    opacity: 0.4,
    blur: 8,
  },
  {
    d: "M -100 780 C 420 650, 820 690, 1200 640 S 1560 560, 1700 600 L 1700 700 C 1520 660, 1300 720, 1150 740 S 300 760, -100 900 Z",
    opacity: 0.35,
    blur: 26,
  },
  {
    d: "M -100 300 C 400 240, 820 300, 1180 250 S 1560 150, 1700 190 L 1700 205 C 1560 175, 1320 280, 1160 290 S 420 280, -100 330 Z",
    opacity: 0.22,
    blur: 10,
  },
];

// Thin light streaks riding along the swooshes.
const STREAKS = [
  "M -100 600 C 320 500, 640 450, 1010 500 S 1500 620, 1700 540",
  "M -100 548 C 280 460, 700 392, 1080 438 S 1560 505, 1700 470",
  "M -100 690 C 360 600, 760 560, 1100 575 S 1560 650, 1700 600",
];

export function AquaWallpaper({ className = "" }: { className?: string }) {
  // The picture can appear twice on a page, so its SVG ids must be unique.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `${name}-${uid}`;
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={id("aqua-sky")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#062a6e" />
            <stop offset="0.45" stopColor="#0f4fb0" />
            <stop offset="0.8" stopColor="#2a7fe0" />
            <stop offset="1" stopColor="#4d9cf0" />
          </linearGradient>
          <radialGradient id={id("aqua-glow")} cx="0.7" cy="0.62" r="0.6">
            <stop offset="0" stopColor="#9fd0ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#9fd0ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("aqua-shade")} cx="0.15" cy="0.1" r="0.7">
            <stop offset="0" stopColor="#021a4a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#021a4a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id("aqua-ribbon")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.35" stopColor="#e6f3ff" stopOpacity="0.9" />
            <stop offset="0.7" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="1" stopColor="#cfe6ff" stopOpacity="0.2" />
          </linearGradient>
          {SWOOSHES.map((s, i) => (
            <filter key={i} id={id(`aqua-blur-${i}`)} x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation={s.blur} />
            </filter>
          ))}
          <filter id={id("aqua-streak-blur")}>
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill={`url(#${id("aqua-sky")})`} />
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${id("aqua-glow")})`} />
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${id("aqua-shade")})`} />

        {SWOOSHES.map((s, i) => (
          <path
            key={i}
            d={s.d}
            fill={`url(#${id("aqua-ribbon")})`}
            opacity={s.opacity}
            filter={`url(#${id(`aqua-blur-${i}`)})`}
          />
        ))}
        {STREAKS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={0.55 - i * 0.12}
            strokeWidth={1.5}
            filter={`url(#${id("aqua-streak-blur")})`}
          />
        ))}
      </svg>
      {/* Night: dim the picture so dark windows don't glare against it. */}
      <div className="absolute inset-0 hidden bg-[#020a1e]/55 dark:block" />
    </div>
  );
}
