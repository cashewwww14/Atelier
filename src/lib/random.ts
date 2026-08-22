/**
 * Seeded PRNG (mulberry32).
 *
 * The scatter fields — grass, trees, dust — are part of the composition, not
 * noise to be re-rolled on every load. A fixed seed means the treeline you
 * framed is the treeline every visitor sees, and it keeps the generators pure
 * enough to run inside a memo without `Math.random()`'s side effects.
 */
export function makeRandom(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
