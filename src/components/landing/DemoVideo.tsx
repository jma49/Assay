"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Language } from "./content";

const COPY = {
  en: { label: "A 40-second tour of the Assay demo workspace", pause: "Pause video", play: "Play video" },
  zh: { label: "40 秒浏览 Assay 演示工作区", pause: "暂停视频", play: "播放视频" },
};

/**
 * The product tour recorded by scripts/demo-video/record.mjs. It plays muted on
 * a loop like a screenshot that moves; with reduced motion it waits for a
 * click, and the button pauses it either way.
 */
export function DemoVideo({ lang }: { lang: Language }) {
  const t = COPY[lang];
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const suffix = lang === "zh" ? "-zh" : "";

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.play().catch(() => {
      // Autoplay can be refused (data saver, some mobile browsers); the button still plays it.
    });
  }, [lang]);

  const toggle = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) void element.play();
    else element.pause();
  };

  return (
    <div className="relative bg-night">
      <video
        key={lang}
        ref={video}
        className="block aspect-[8/5] w-full"
        muted
        loop
        playsInline
        preload="metadata"
        poster={`/video/assay-demo${suffix}.jpg`}
        aria-label={t.label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={`/video/assay-demo${suffix}.webm`} type="video/webm" />
        <source src={`/video/assay-demo${suffix}.mp4`} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t.pause : t.play}
        className={`absolute grid place-items-center rounded-full bg-night/85 text-night-foreground shadow-md backdrop-blur transition-[background-color,scale,opacity] duration-150 ease-out hover:bg-night active:scale-[0.96] ${
          playing ? "right-4 bottom-4 size-10 opacity-70 hover:opacity-100" : "top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2"
        }`}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-6 translate-x-px" />}
      </button>
    </div>
  );
}
