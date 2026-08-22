"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/**
 * Holds the hub until the models are ready, once per visit.
 *
 * The flag is module scope on purpose. This lives inside the hub, so returning
 * from a section remounts it — and a component-local "already done" state
 * would reset with it, dropping the curtain over a scene that has been loaded
 * for minutes. Navigating home should be instant; it is the same canvas that
 * never went away.
 */
let alreadyShown = false;
export function Preloader() {
  const { progress, active } = useProgress();
  const [done, setDone] = useState(alreadyShown);
  const [gone, setGone] = useState(alreadyShown);

  useEffect(() => {
    if (active || progress < 100) return;
    const t = setTimeout(() => setDone(true), 320);
    return () => clearTimeout(t);
  }, [active, progress]);

  useEffect(() => {
    if (!done) return;
    alreadyShown = true;
    const t = setTimeout(() => setGone(true), 1000);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div
      aria-hidden={done}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-surface"
      style={{
        opacity: done ? 0 : 1,
        transition: "opacity 900ms var(--ease-out-expo)",
        pointerEvents: done ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <p className="font-display text-[clamp(1.4rem,3.4vw,2rem)] text-ink">Bengkel</p>

        <div className="h-px w-52 overflow-hidden bg-shell">
          <div
            className="h-full bg-moss"
            style={{ width: `${progress}%`, transition: "width 450ms var(--ease-out-expo)" }}
          />
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-faint">
          menyiapkan · {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
