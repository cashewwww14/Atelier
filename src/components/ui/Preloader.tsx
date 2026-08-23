"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useScene } from "@/lib/scene-state";

/**
 * The curtain over the hub — and the door through it.
 *
 * It is deliberately not a timer. Browsers refuse to play audio with sound
 * until the visitor has interacted with the page, so a screen that dismisses
 * itself would land them in a silent hub and leave the player waiting for a
 * stray click. Asking them to step inside collects that gesture honestly, and
 * the sound starts on the same beat the scene does.
 *
 * The veil thins as the models arrive rather than hiding them until the end.
 * There is a real scene behind this, already turning; showing it load is more
 * interesting than a progress bar over a flat colour.
 *
 * Whether the curtain has been opened lives in scene state, not here. This
 * component is mounted inside the hub, so returning from a section remounts
 * it, and anything it remembered locally would come back with it.
 */
export function Preloader() {
  const { progress, active } = useProgress();
  const { entered, enterSite } = useScene();
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);

  // A short beat after the last asset lands, so the door does not appear
  // mid-stutter while the first frames are still settling.
  useEffect(() => {
    if (active || progress < 100) return;
    const t = setTimeout(() => setReady(true), 380);
    return () => clearTimeout(t);
  }, [active, progress]);

  // Unmount only after the fade has run its course.
  useEffect(() => {
    if (!entered) return;
    const t = setTimeout(() => setGone(true), 1100);
    return () => clearTimeout(t);
  }, [entered]);

  if (gone || (entered && !ready)) return null;

  const shown = Math.round(progress);

  return (
    <div
      aria-hidden={entered}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center"
      style={{
        // Thins from almost opaque to a haze as the models arrive, so the
        // objects turning behind it come gradually into view.
        background: `color-mix(in oklab, var(--color-surface) ${96 - shown * 0.3}%, transparent)`,
        backdropFilter: `blur(${entered ? 0 : 10 - shown * 0.06}px)`,
        opacity: entered ? 0 : 1,
        transition:
          "opacity 1000ms var(--ease-out-expo), backdrop-filter 1000ms var(--ease-out-expo), background 700ms linear",
        pointerEvents: entered ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center gap-7">
        <p
          className="font-display text-[clamp(1.4rem,3.4vw,2rem)] text-ink"
          style={{ animation: "curtain-rise 1200ms var(--ease-out-expo) both" }}
        >
          The workshop
        </p>

        {/* Loading and ready share one slot, so the swap is a cross-fade in
            place rather than the layout jumping under the visitor. */}
        <div className="relative flex h-11 w-64 items-center justify-center">
          <div
            className="absolute inset-x-0 flex flex-col items-center gap-4"
            style={{
              opacity: ready ? 0 : 1,
              transform: ready ? "translateY(-6px)" : "none",
              transition: "opacity 600ms var(--ease-out-expo), transform 600ms var(--ease-out-expo)",
            }}
          >
            <div className="h-px w-52 overflow-hidden bg-shell">
              <div
                className="h-full bg-moss"
                style={{ width: `${progress}%`, transition: "width 450ms var(--ease-out-expo)" }}
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-faint">
              Preparing · {shown}%
            </p>
          </div>

          <button
            onClick={enterSite}
            tabIndex={ready ? 0 : -1}
            className="group absolute rounded-full border border-edge px-7 py-2.5 font-mono text-[10px] uppercase tracking-[0.26em] text-muted transition-colors duration-500 hover:border-moss hover:text-moss"
            style={{
              opacity: ready && !entered ? 1 : 0,
              transform: ready ? "none" : "translateY(8px) scale(0.97)",
              transition:
                "opacity 800ms var(--ease-out-expo) 120ms, transform 800ms var(--ease-out-expo) 120ms, color 500ms, border-color 500ms",
              pointerEvents: ready && !entered ? "auto" : "none",
            }}
          >
            {/* A slow ring, breathing outward. It says "this is waiting for
                you" without a word of instruction. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border border-moss"
              style={{ animation: ready ? "curtain-pulse 3200ms ease-out infinite" : "none" }}
            />
            Step inside
          </button>
        </div>
      </div>
    </div>
  );
}
