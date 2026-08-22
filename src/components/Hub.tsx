"use client";

import Image from "next/image";
import { HUB, labelPosition } from "@/data/hub";
import { profile } from "@/data/profile";
import { useIsCompact, useReducedMotion } from "@/lib/env";
import { useScene } from "@/lib/scene-state";
import { Preloader } from "./ui/Preloader";

/**
 * The hub overlay: the figure, the name, and the four labels.
 *
 * The 3D itself lives in the root layout — this is only what is drawn on top
 * of it. When an object is launched, everything here clears out of the way so
 * the object has the frame to itself on its way forward.
 */
export function Hub() {
  const { leaving: departing, enter } = useScene();
  const compact = useIsCompact();
  const reduced = useReducedMotion();
  const leaving = departing !== null;

  return (
    <main className="pointer-events-none relative h-[100svh] w-full overflow-hidden">
      <Preloader />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: leaving ? 0 : 1,
          transform: leaving ? "scale(1.04)" : "none",
          transition: "opacity 760ms var(--ease-out-expo), transform 1100ms var(--ease-out-expo)",
        }}
      >
        {/* The top-right corner belongs to the Apple Music player, so the
            location line sits with the hint at the foot of the page. */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-[var(--shell-pad)] pt-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted">
            {profile.role}
          </p>
        </header>

        {/* The figure is a 2D illustration, not a model — it carries far more
            character than the model budget could have bought, and it keeps that
            budget for the four objects that are navigation. */}
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
          <Image
            src="/figure.webp"
            alt="Illustration of Ahmad Zaky sitting on a stack of books, a laptop balanced on his head"
            width={756}
            height={1511}
            priority
            className="h-[clamp(11rem,32vh,20rem)] w-auto select-none"
            style={{
              animation: reduced ? undefined : "figure-breathe 7s ease-in-out infinite",
              filter: "drop-shadow(0 22px 26px rgb(87 75 59 / 0.16))",
            }}
          />

          <h1 className="mt-6 max-w-[14ch] text-balance text-center font-display text-[clamp(1.5rem,3.4vw,2.5rem)] leading-[1.04] text-ink sm:max-w-none">
            {profile.name}
          </h1>
          <p className="mt-3 max-w-[34ch] text-balance text-center text-[clamp(0.82rem,1.15vw,0.97rem)] leading-relaxed text-muted">
            {profile.tagline}
          </p>
        </div>

        {HUB.map((item) => {
          const pos = labelPosition(item, compact);
          return (
            <button
              key={item.id}
              onClick={() => enter(item.id, item.href)}
              className="group pointer-events-auto absolute z-30 flex w-[190px] -translate-x-1/2 flex-col items-center text-center"
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            >
              <span className="font-display text-[clamp(1.1rem,1.9vw,1.55rem)] leading-none text-ink transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:-translate-y-[3px]">
                {item.label}
              </span>
              <span className="mt-1.5 text-[clamp(0.7rem,0.92vw,0.82rem)] leading-snug text-muted">
                {item.caption}
              </span>
              <span className="mt-2 block h-[2px] w-0 rounded-full bg-moss transition-[width] duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:w-[38px]" />
            </button>
          );
        })}

        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-center pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-faint">
            Pick something up to begin
            <span className="hidden sm:inline"> · {profile.location}</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
