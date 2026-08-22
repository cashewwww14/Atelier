"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Frame } from "@/data/projects";
import { BrowserFrame } from "./frames/BrowserFrame";
import { PhoneFrame } from "./frames/PhoneFrame";
import { MOCKUPS, MOCKUP_URLS } from "./mockups";

const DESIGN = { w: 1280, h: 800 };

/**
 * Scales the desktop mockups to fit while keeping them usable.
 *
 * `zoom` rather than `transform: scale()` — transform promotes the panel to
 * its own composited layer and leaves hit-testing to fight the matrix, while
 * zoom scales during layout, so text is laid out at its final size and every
 * button still sits exactly where it is drawn.
 */
function Scaled({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measure before paint; waiting for the observer's first callback leaves
    // the panel invisible for a frame.
    setScale(el.clientWidth / DESIGN.w);
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / DESIGN.w));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div
        style={{
          width: DESIGN.w,
          height: DESIGN.h,
          zoom: scale || undefined,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface LiveMockupProps {
  id: string;
  accent: string;
  frame: Frame;
}

/**
 * The running interface. Nothing here is a screenshot — the controls work, and
 * every figure inside is invented sample data.
 */
export function LiveMockup({ id, accent, frame }: LiveMockupProps) {
  const Mockup = MOCKUPS[id];
  if (!Mockup) return null;

  return (
    <figure className="m-0">
      {frame === "phone" ? (
        <div className="flex justify-center">
          <PhoneFrame accent={accent}>
            <Mockup />
          </PhoneFrame>
        </div>
      ) : (
        <BrowserFrame url={MOCKUP_URLS[id]} accent={accent}>
          <Scaled>
            <Mockup />
          </Scaled>
        </BrowserFrame>
      )}

      <figcaption className="mt-4 flex items-center justify-center gap-2 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
        <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: accent }} />
        Live and usable · sample data throughout
      </figcaption>
    </figure>
  );
}
