"use client";

import { useEffect, useState } from "react";

export interface Me {
  role: string | null;
  permissions: string[];
  /** Present when the workspace runs as the public demo. */
  demo: { runsPerHour: number } | null;
  /** Whether the AI helpers are switched on (AI_ENABLED). */
  ai: boolean;
}

// One request per page load; every component asking shares it.
let request: Promise<Me | null> | null = null;

function loadMe(): Promise<Me | null> {
  request ??= fetch("/api/me")
    .then((response) => (response.ok ? (response.json() as Promise<Me>) : null))
    .catch(() => null);
  return request;
}

/**
 * The signed-in user's role and permissions, for showing only the actions
 * they can take. Null while loading or if the request fails; the APIs still
 * enforce permissions either way.
 */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let active = true;
    loadMe().then((value) => active && setMe(value));
    return () => {
      active = false;
    };
  }, []);
  return me;
}
