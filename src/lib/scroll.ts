"use client";

import { useEffect } from "react";

/**
 * Smooth scrolling for the content pages.
 *
 * The camera no longer rides the scrollbar — each destination is its own route
 * now — so this is just inertia on the wheel. Long duration with an expo-out
 * curve is what makes it feel weighted rather than sticky; under about a
 * second it reads as ordinary scrolling and is not worth the script.
 */
export function useLenis(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let lenis: import("lenis").default | null = null;
    let raf = 0;
    let cancelled = false;

    (async () => {
      const Lenis = (await import("lenis")).default;
      if (cancelled) return;

      lenis = new Lenis({
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 0.95,
        touchMultiplier: 1.6,
        syncTouch: true,
      });

      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, [enabled]);
}
