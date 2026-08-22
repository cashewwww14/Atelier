"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { profile } from "@/data/profile";
import { useReducedMotion } from "@/lib/env";
import { useLenis } from "@/lib/scroll";

interface PageShellProps {
  /** Section name shown above the title. */
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
  /** Where the back control goes; defaults to the hub. */
  backHref?: string;
  backLabel?: string;
}

/**
 * Frame for every destination page.
 *
 * The background is deliberately transparent: the object you picked up is
 * still there, parked behind this text, and painting over it would break the
 * one idea the whole design rests on. A soft column scrim keeps the type
 * readable without hiding it.
 */
export function PageShell({
  eyebrow,
  title,
  lede,
  children,
  backHref = "/",
  backLabel = "Back to the workshop",
}: PageShellProps) {
  const reduced = useReducedMotion();
  const router = useRouter();
  useLenis(!reduced);

  return (
    <div className="pointer-events-auto relative min-h-screen">
      {/* Readability scrim, weighted to the left where the column sits, so the
          object on the right stays visible instead of the page being flooded. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[1]"
        style={{
          background:
            "linear-gradient(100deg, var(--color-surface) 0%, var(--color-surface) 40%, color-mix(in oklab, var(--color-surface) 82%, transparent) 62%, color-mix(in oklab, var(--color-surface) 34%, transparent) 100%)",
        }}
      />

      {/* Back control. Fixed, round, and large enough to be an obvious way out —
          a text link in the corner was too easy to miss. Returning to the hub
          sends the objects spinning back to their places. */}
      <div className="fixed left-[var(--shell-pad)] top-7 z-40">
        <button
          onClick={() => router.push(backHref)}
          className="group flex items-center gap-3"
          aria-label={backLabel}
        >
          <span
            className="grid h-11 w-11 place-items-center rounded-full border border-rule bg-surface text-[15px] text-ink shadow-[0_1px_2px_rgb(87_75_59_/_0.05),0_10px_26px_-14px_rgb(87_75_59_/_0.3)] transition-all duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:-translate-x-1 group-hover:border-moss group-hover:text-moss"
          >
            ←
          </span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-muted transition-colors duration-300 group-hover:text-ink sm:inline">
            {backLabel}
          </span>
        </button>
      </div>

      <div className="relative px-[var(--shell-pad)] pb-28 pt-[clamp(4.5rem,11vh,8rem)]">
        <div className="mx-auto max-w-[1120px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-moss">{eyebrow}</p>
          <h1 className="mt-4 font-display text-[clamp(2.4rem,6.5vw,4.6rem)] leading-[0.98] text-ink">
            {title}
          </h1>
          {lede && (
            <p className="mt-6 max-w-[56ch] text-pretty text-[clamp(1rem,1.5vw,1.15rem)] leading-relaxed text-muted">
              {lede}
            </p>
          )}

          <div className="mt-[clamp(3rem,7vh,5.5rem)]">{children}</div>
        </div>
      </div>

      <footer className="relative border-t border-rule bg-surface/70 px-[var(--shell-pad)] py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {profile.name} · {new Date().getFullYear()}
          </p>
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted transition-colors hover:text-ink"
          >
            Workshop
          </Link>
        </div>
      </footer>
    </div>
  );
}
