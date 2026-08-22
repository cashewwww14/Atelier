import type { ReactNode } from "react";

interface PhoneFrameProps {
  accent: string;
  children: ReactNode;
}

/**
 * Handset chrome for the mobile-first mockups. The status bar is drawn rather
 * than faked with an image so it stays crisp at any zoom and inherits the
 * palette.
 */
export function PhoneFrame({ accent, children }: PhoneFrameProps) {
  return (
    <div
      className="relative mx-auto w-full max-w-[392px] rounded-[46px] p-[11px]"
      style={{
        background: "linear-gradient(160deg, #efe9dd, #d9d2c4 55%, #e7e0d2)",
        boxShadow: `0 2px 4px rgb(87 75 59 / 0.06), 0 34px 70px -30px rgb(87 75 59 / 0.34), inset 0 0 0 1px ${accent}22`,
      }}
    >
      <div
        className="relative overflow-hidden rounded-[36px]"
        style={{ background: "#fdfbf7", aspectRatio: "9 / 19" }}
      >
        <div className="relative z-10 flex items-center justify-between px-7 pb-1 pt-3.5">
          <span className="font-mono text-[10px] font-semibold" style={{ color: "#4a4736" }}>
            9:41
          </span>
          <span className="flex items-center gap-[3px]">
            {[3, 5, 7, 9].map((h) => (
              <span
                key={h}
                className="block w-[2.5px] rounded-[1px]"
                style={{ height: h, background: "#6d6a4f" }}
              />
            ))}
            <span
              className="ml-1 block h-[9px] w-[16px] rounded-[3px] p-[1.5px]"
              style={{ border: "1px solid #8b876b" }}
            >
              <span className="block h-full w-[72%] rounded-[1px]" style={{ background: "#6d6a4f" }} />
            </span>
          </span>
        </div>

        {/* Pill cut-out, floating over the app content. */}
        <span
          aria-hidden
          className="absolute left-1/2 top-[8px] z-20 h-[21px] w-[80px] -translate-x-1/2 rounded-full"
          style={{ background: "#2b2822" }}
        />

        <div className="relative h-[calc(100%-2rem)] overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
