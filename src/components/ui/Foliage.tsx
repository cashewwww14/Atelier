"use client";

import { useMemo } from "react";
import { makeRandom } from "@/lib/random";
import { useReducedMotion } from "@/lib/env";

/**
 * Dry leaves drifting across the page.
 *
 * Hand-drawn marks floating around the subject — the trick Heartstopper uses —
 * tied here to the site's own motif. Pure SVG and CSS transforms, so it
 * composites on the GPU and costs nothing beside the WebGL canvas.
 *
 * The outlines are generated rather than drawn. A leaf is a blade envelope
 * (wide at the base, tapering to a tip) modulated by a lobe wave, so one
 * function covers maple, oak and plain ovate depending on three numbers — and
 * every leaf on screen gets its own. Hand-drawn paths gave three shapes that
 * repeated visibly; this gives as many as there are leaves.
 *
 * Nothing here aims at botanical accuracy. It is an illustration: readable
 * silhouette, midrib, side veins, and that is enough at these sizes.
 */

interface LeafGeometry {
  blade: string;
  veins: string;
}

/**
 * Build one leaf outline on a 48×48 grid, base at the bottom, tip at the top.
 *
 * @param lobes      number of lobe pairs — 0 reads as a plain leaf, 5 as maple
 * @param lobeDepth  how deeply the lobes cut in, 0..0.6
 * @param taper      tip sharpness; higher is a narrower point
 * @param width      half-width of the blade at its widest, in viewBox units
 */
function buildLeaf(lobes: number, lobeDepth: number, taper: number, width: number): LeafGeometry {
  const STEPS = 54;
  const AXIS_X = 24;
  const BASE_Y = 42;
  const LENGTH = 36;

  /** Half-width of the blade at position t along the midrib (0 base, 1 tip). */
  const halfWidth = (t: number) => {
    // Envelope: widest a little below centre, then runs out at the tip.
    // The exponent places that widest point — 0.58 put it at t≈0.3, which made
    // every leaf bottom-heavy and slightly gourd-shaped.
    const envelope = Math.sin(Math.PI * Math.pow(t, 0.82)) ** taper;
    // Lobes ride on top of it; cos keeps a notch at the base of each pair.
    const lobe = 1 - lobeDepth * (0.5 - 0.5 * Math.cos(2 * Math.PI * lobes * t));
    return envelope * lobe * width;
  };

  const right: string[] = [];
  const left: string[] = [];

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const w = halfWidth(t);
    const y = (BASE_Y - t * LENGTH).toFixed(2);
    right.push(`${(AXIS_X + w).toFixed(2)},${y}`);
    left.push(`${(AXIS_X - w).toFixed(2)},${y}`);
  }

  const blade = `M${right.join(" L")} L${left.reverse().join(" L")} Z`;

  // Midrib runs the whole length, through the stem. Side veins reach for the
  // widest point of each lobe, which is what makes the lobes read as lobes.
  const veinCount = Math.max(3, Math.round(lobes) * 2 || 5);
  // The midrib stops short of the tip. Running it the full length left a
  // hairline spiking out past the point, where the blade has no width left to
  // cover it.
  const veins = [`M${AXIS_X} 47 V${(BASE_Y - LENGTH * 0.93).toFixed(2)}`];
  for (let i = 1; i <= veinCount; i++) {
    const t = i / (veinCount + 1);
    const w = halfWidth(t) * 0.82;
    const y = BASE_Y - t * LENGTH;
    // Angled toward the tip, the way veins actually leave a midrib.
    const yTo = y - LENGTH * 0.055;
    veins.push(`M${AXIS_X} ${y.toFixed(2)} L${(AXIS_X + w).toFixed(2)} ${yTo.toFixed(2)}`);
    veins.push(`M${AXIS_X} ${y.toFixed(2)} L${(AXIS_X - w).toFixed(2)} ${yTo.toFixed(2)}`);
  }

  return { blade, veins: veins.join("") };
}

/** Autumn, not summer: everything here has already dried on the branch. */
const TINTS = [
  "#a8863f",
  "#b5763a",
  "#8f6b32",
  "#c19553",
  "#7d5f2e",
  "#9a8340",
  "#8a6a3c",
  "#a4622f",
  "#b8925a",
];

interface Drifter {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  dx: number;
  dy: number;
  swayX: number;
  swayY: number;
  spin: number;
  /** Scale at the start, middle and end — the leaf drifts toward you and away. */
  scaleFrom: number;
  scaleMid: number;
  scaleTo: number;
  geometry: LeafGeometry;
  tint: string;
  opacity: number;
}

function Leaf({ geometry, size }: { geometry: LeafGeometry; size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path d={geometry.blade} fill="currentColor" />
      <path
        d={geometry.veins}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.85"
        strokeLinecap="round"
        // Darkened against the blade it sits on, rather than a second colour.
        style={{ filter: "brightness(0.68)" }}
      />
    </svg>
  );
}

export function Foliage({ count = 26, seed = 0x1eaf }: { count?: number; seed?: number }) {
  const reduced = useReducedMotion();

  const leaves = useMemo<Drifter[]>(() => {
    const rand = makeRandom(seed);

    return Array.from({ length: count }, () => {
      // A direction anywhere on the circle, weighted a little downward so the
      // drift still reads as leaves rather than confetti.
      const angle = rand() * Math.PI * 2;
      const bias = 0.3;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle) * (1 - bias) + bias;

      // Long enough that a leaf crosses the frame and keeps going, but not so
      // long that it spends its cycle off-screen. An earlier pass used 400vmax
      // and the page looked empty: at four screens of travel, almost none of
      // the track is ever in view. What actually hides the repetition is the
      // slow clock plus the spread of directions and depths, not raw distance.
      const distance = 130 + rand() * 90;

      // Sway happens across the line of travel, not along it.
      const swayAmount = 60 + rand() * 180;

      // Depth: the leaf swims toward the viewer and away again.
      const near = 1.15 + rand() * 0.55;
      const far = 0.45 + rand() * 0.3;
      const startNear = rand() > 0.5;

      // 5 lobe pairs read as a fir rather than a broadleaf, so the set stops
      // at 3: plain, gently waved, and oak-ish.
      const lobes = [0, 0, 2, 2, 3][Math.floor(rand() * 5)];
      const geometry = buildLeaf(
        lobes,
        lobes === 0 ? 0 : 0.18 + rand() * 0.24,
        1.1 + rand() * 1.3,
        // Viewbox units, not a fraction. Passing 0.4 here made a blade 1.4
        // units wide inside a 48-unit box, which drew as a hairline.
        7.5 + rand() * 5,
      );

      return {
        // Start anywhere, well outside the frame included, so leaves enter from
        // every edge instead of raining from the top.
        left: rand() * 150 - 25,
        top: rand() * 150 - 25,
        size: 34 + rand() * 76,
        // Very long, heavily staggered cycles. Between this and the distance,
        // no two leaves are ever at a comparable point in their track.
        delay: -rand() * 140,
        duration: 42 + rand() * 54,
        dx: dirX * distance,
        dy: dirY * distance,
        swayX: -dirY * swayAmount,
        swayY: dirX * swayAmount,
        spin: (rand() - 0.5) * 1080,
        scaleFrom: startNear ? near : far,
        scaleMid: startNear ? far : near,
        scaleTo: startNear ? near * 0.85 : far * 1.2,
        geometry,
        tint: TINTS[Math.floor(rand() * TINTS.length)],
        // Faint enough to stay behind the content, solid enough that the
        // veins and lobes actually read — below about 0.2 the detail is there
        // in the markup and invisible on screen.
        opacity: 0.26 + rand() * 0.26,
      };
    });
  }, [count, seed]);

  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {leaves.map((leaf, i) => (
        <span
          key={i}
          className="absolute block will-change-transform"
          style={{
            left: `${leaf.left.toFixed(3)}%`,
            top: `${leaf.top.toFixed(3)}%`,
            color: leaf.tint,
            animation: `leaf-travel ${leaf.duration.toFixed(2)}s linear ${leaf.delay.toFixed(2)}s infinite`,
            ["--dx" as string]: `${leaf.dx.toFixed(2)}vmax`,
            ["--dy" as string]: `${leaf.dy.toFixed(2)}vmax`,
            ["--sway-x" as string]: `${leaf.swayX.toFixed(2)}px`,
            ["--sway-y" as string]: `${leaf.swayY.toFixed(2)}px`,
            ["--spin" as string]: `${leaf.spin.toFixed(2)}deg`,
            ["--peak" as string]: leaf.opacity.toFixed(3),
            ["--s-from" as string]: leaf.scaleFrom.toFixed(3),
            ["--s-mid" as string]: leaf.scaleMid.toFixed(3),
            ["--s-to" as string]: leaf.scaleTo.toFixed(3),
          }}
        >
          <Leaf geometry={leaf.geometry} size={leaf.size} />
        </span>
      ))}
    </div>
  );
}
