"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Media queries read through useSyncExternalStore rather than an effect that
 * calls setState. The store is the MediaQueryList itself, so the first render
 * already has the right answer instead of correcting itself on the next pass.
 */
function useMediaQuery(query: string, serverFallback = false) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

export const useIsCompact = () => useMediaQuery("(max-width: 860px)");
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
export const useCoarsePointer = () => useMediaQuery("(pointer: coarse)");

/**
 * Tiered quality. The scene is authored at `high` and degrades by dropping
 * whole systems rather than scaling everything down uniformly — a blurry
 * full-effect frame looks worse than a crisp reduced one.
 */
export type Quality = "high" | "medium" | "low";

let weakDevice: boolean | null = null;

/** Rough proxy for GPU class, deliberately conservative. Never changes. */
function isWeakDevice() {
  if (weakDevice !== null) return weakDevice;
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  weakDevice = cores <= 4 || mem <= 4;
  return weakDevice;
}

export function useQuality(): Quality {
  const compact = useIsCompact();
  const reduced = useReducedMotion();

  if (reduced || isWeakDevice()) return "low";
  return compact ? "medium" : "high";
}
