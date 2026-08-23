export interface HubObject {
  id: string;
  model: string;
  /** Where clicking it goes. */
  href: string;
  label: string;
  caption: string;
  /**
   * Position as a fraction of the visible half-extent: -1 is the left/bottom
   * edge, +1 the right/top.
   *
   * Absolute world coordinates were the layout bug — the camera's visible area
   * grows with the window, so fixed positions flung the four objects into the
   * corners of a large screen and left a hole in the middle. Fractions keep the
   * composition identical at every size, and let the DOM labels be derived from
   * the same numbers instead of being tuned separately.
   */
  nx: number;
  ny: number;
  /** Size as a fraction of the visible height. */
  scale: number;
  /** Compact overrides for portrait screens. */
  compact: { nx: number; ny: number; scale: number };
  /** Resting tilt, so the four objects do not read as one rigid grid. */
  tilt: [number, number, number];
}

/**
 * These four objects are the navigation. There is no menu behind them.
 *
 * Each one stands for the section it opens: the half-carved statue for the
 * person still being made, the workbench for what has been finished on it, the
 * rune stone for what he knows, and the signpost for how to reach him.
 */
export const HUB: HubObject[] = [
  {
    id: "patung",
    model: "/models/patung-setengah.glb",
    href: "/about",
    label: "About",
    caption: "Who works here",
    nx: -0.58,
    ny: 0.44,
    scale: 0.3,
    compact: { nx: -0.46, ny: 0.62, scale: 0.19 },
    tilt: [0.06, 0.55, -0.04],
  },
  {
    id: "rune",
    model: "/models/batu-rune.glb",
    href: "/craft",
    label: "Craft",
    caption: "What he works with",
    nx: 0.58,
    ny: 0.44,
    scale: 0.26,
    compact: { nx: 0.46, ny: 0.62, scale: 0.16 },
    tilt: [0.08, -0.42, 0.05],
  },
  {
    id: "bench",
    model: "/models/meja-kerja.glb",
    href: "/work",
    label: "Work",
    caption: "Seven things that shipped",
    nx: -0.58,
    ny: -0.4,
    scale: 0.28,
    compact: { nx: -0.46, ny: -0.5, scale: 0.18 },
    tilt: [0.14, -0.62, 0.05],
  },
  {
    id: "signpost",
    model: "/models/tiang-penunjuk.glb",
    href: "/contact",
    label: "Contact",
    caption: "The way to reach him",
    nx: 0.58,
    ny: -0.36,
    scale: 0.24,
    compact: { nx: 0.46, ny: -0.5, scale: 0.15 },
    tilt: [0.04, 0.42, -0.06],
  },
];

/**
 * Where a focused object parks once its page is open.
 *
 * The object does not disappear when you enter its section — it flies forward,
 * then settles large and off to one side, becoming the page's backdrop. That
 * continuity is the whole point: the hub and the page are one space.
 */
export const FOCUS_POSE = {
  // Far enough right to clear the reading column at 1120px, which is where the
  // second text column ends — closer in and it sits behind the words.
  nx: 0.82,
  ny: 0.16,
  scale: 0.72,
  compact: { nx: 0.42, ny: 0.36, scale: 0.55 },
};

/** Which object owns a given route, or null on the hub. */
export function objectForPath(pathname: string) {
  if (pathname === "/") return null;
  return HUB.find((h) => pathname === h.href || pathname.startsWith(`${h.href}/`))?.id ?? null;
}

/** Gap between an object's lower edge and its label, as a fraction of height. */
export const LABEL_GAP = 0.055;

/** Screen position of a label, in viewport percentages. */
export function labelPosition(item: HubObject, compact: boolean) {
  const { nx, ny, scale } = compact ? item.compact : item;
  return {
    left: 50 + nx * 50,
    top: 50 - ny * 50 + (scale / 2 + LABEL_GAP) * 100,
  };
}
