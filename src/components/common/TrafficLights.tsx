"use client";

import { cn } from "@/lib/utils/utils";

interface Light {
  label: string;
  onClick?: () => void;
}

/**
 * Aqua close / minimise / zoom buttons. Pointing at the group shows × – +
 * as on the Mac. A light without a handler is drawn but does nothing.
 */
export function TrafficLights({
  close,
  minimize,
  zoom,
  className,
}: {
  close?: Light;
  minimize?: Light;
  zoom?: Light;
  className?: string;
}) {
  const lights = [close, minimize, zoom];
  const interactive = lights.some((light) => light?.onClick);

  if (!interactive) {
    return (
      <span className={cn("aqua-lights", className)} aria-hidden>
        <i />
        <i />
        <i />
      </span>
    );
  }

  return (
    <span className={cn("aqua-lights", className)}>
      {lights.map((light, i) =>
        light?.onClick ? (
          <button
            key={i}
            type="button"
            aria-label={light.label}
            title={light.label}
            onClick={light.onClick}
          />
        ) : (
          <i key={i} aria-hidden />
        ),
      )}
    </span>
  );
}
