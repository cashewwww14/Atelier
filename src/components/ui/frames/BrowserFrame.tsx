import type { ReactNode } from "react";

interface BrowserFrameProps {
  url: string;
  accent: string;
  children: ReactNode;
  ratio?: string;
}

/**
 * Window chrome for the desktop mockups.
 *
 * Neutral on purpose — it borrows the shape of a browser without imitating any
 * particular one, so the eye reads "this is a web app" and moves straight to
 * the interface inside.
 */
export function BrowserFrame({ url, accent, children, ratio = "16 / 10" }: BrowserFrameProps) {
  return (
    <div
      className="overflow-hidden rounded-[14px]"
      style={{
        background: "#f4f1ea",
        border: "1px solid var(--color-rule)",
        boxShadow: "0 2px 4px rgb(87 75 59 / 0.05), 0 28px 60px -28px rgb(87 75 59 / 0.28)",
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--color-rule)" }}
      >
        <div className="flex shrink-0 gap-[6px]">
          {["#d8b3ac", "#e0cba4", "#b9cfae"].map((dot) => (
            <span key={dot} className="block h-[9px] w-[9px] rounded-full" style={{ background: dot }} />
          ))}
        </div>

        <div
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1"
          style={{ background: "#fdfbf7", border: "1px solid #e8e3d7" }}
        >
          <span className="block h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: accent }} />
          <span className="truncate font-mono text-[10px] tracking-tight" style={{ color: "#8b876b" }}>
            {url}
          </span>
        </div>
      </div>

      <div style={{ aspectRatio: ratio }} className="relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}
