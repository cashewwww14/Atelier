"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Shared chrome for the interactive mockups.
 *
 * These are no longer pictures of apps — each one runs, so the tokens here are
 * for a real interface: a light surface, a raised panel, and ink levels whose
 * contrast is verified (ink 15.9:1, secondary 9.1:1, muted 5.3:1 on the app
 * surface; `faint` is UI-only at 3.5:1 and never carries body text).
 */
export const INK = {
  bg: "#fdfbf7",
  panel: "#f4f1ea",
  raise: "#ffffff",
  line: "#e4dfd3",
  ink: "#22200e",
  secondary: "#4a4736",
  muted: "#6d6a4f",
  faint: "#8b876b",
} as const;

export function AppSurface({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        background: INK.bg,
        color: INK.ink,
        fontFamily: "var(--font-inter)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ background: INK.raise, border: `1px solid ${INK.line}`, ...style }}
    >
      {children}
    </div>
  );
}

/** Status colours are reserved and never reused as series colours. */
export function Chip({
  children,
  tone = "neutral",
  onClick,
  active,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
  onClick?: () => void;
  active?: boolean;
}) {
  const tones = {
    neutral: { bg: "#efece3", fg: "#5a5644" },
    good: { bg: "#e2eedd", fg: "#3d6b32" },
    warn: { bg: "#f6ead2", fg: "#8a5a22" },
    bad: { bg: "#f6e0dc", fg: "#8a473c" },
  }[tone];

  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-medium transition-colors"
      style={{
        background: tones.bg,
        color: tones.fg,
        outline: active ? `1.5px solid ${tones.fg}` : "none",
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      {children}
    </Tag>
  );
}

export function Avatar({ seed, size = 30 }: { seed: string; size?: number }) {
  // Deterministic hue from the label so the same person keeps the same chip.
  const hue = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials = seed
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `oklch(0.9 0.05 ${hue})`,
        color: `oklch(0.42 0.09 ${hue})`,
      }}
    >
      {initials}
    </span>
  );
}

/**
 * Sparkline. 2px stroke, no axes, no grid — it shows shape, and the headline
 * number beside it carries the value.
 */
export function Sparkline({
  points,
  accent,
  width = 220,
  height = 56,
  fill = true,
}: {
  points: number[];
  accent: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 3;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((p - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width - pad},${height} L${pad},${height} Z`;
  const id = `spark-${accent.replace("#", "")}-${points.length}-${Math.round(points[0] * 100)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="3.5" fill={accent} />
    </svg>
  );
}

/** Range input styled to the palette, used by every mockup that has controls. */
export function Slider({
  value,
  onChange,
  accent,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  readout,
}: {
  value: number;
  onChange: (v: number) => void;
  accent: string;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  readout: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block cursor-pointer">
      <span className="flex items-baseline justify-between">
        <span className="text-[11.5px]" style={{ color: INK.secondary }}>
          {label}
        </span>
        <span className="font-mono text-[11px] tabular-nums" style={{ color: INK.ink }}>
          {readout}
        </span>
      </span>

      <span
        className="relative mt-2 block h-[18px]"
        style={{ ["--pct" as string]: `${pct}%`, ["--accent" as string]: accent }}
      >
        <span
          className="absolute left-0 right-0 top-1/2 block h-[4px] -translate-y-1/2 rounded-full"
          style={{ background: "#e4dfd3" }}
        />
        <span
          className="absolute left-0 top-1/2 block h-[4px] -translate-y-1/2 rounded-full"
          style={{ width: `${pct}%`, background: accent }}
        />
        <span
          className="absolute top-1/2 block h-[13px] w-[13px] -translate-y-1/2 rounded-full border-2 bg-white"
          style={{ left: `calc(${pct}% - 6.5px)`, borderColor: accent }}
        />
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </span>
    </label>
  );
}
