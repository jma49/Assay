"use client";

import { useEffect } from "react";
import { Godrays, RadialGradient, Shader } from "shaders/react";
import type { HeroPalette } from "../hero-light";

/** The hero's WebGPU light: slow rays from above over a soft glow, in place of the CSS spotlight. Loaded only where it can run (HeroLight). */
export default function HeroShader({ palette, onLitChange }: { palette: HeroPalette; onLitChange: (lit: boolean) => void }) {
  // Unmounting (reduced motion switched on) hands the hero back to the CSS light.
  useEffect(() => () => onLitChange(false), [onLitChange]);

  return (
    <Shader disableTelemetry colorSpace="srgb" onReady={() => onLitChange(true)} className="hero-shader absolute inset-x-0 top-0 h-[900px]">
      <RadialGradient colorA={palette.accent} colorB="transparent" center={{ x: 0.5, y: 0 }} radius={0.55} opacity={0.3} />
      <Godrays center={{ x: 0.5, y: -0.15 }} rayColor={palette.accentPale} density={0.28} intensity={0.85} spotty={0.3} speed={0.2} opacity={0.6} />
    </Shader>
  );
}
