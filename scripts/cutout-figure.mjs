/**
 * Cut the figure out of its flat studio backdrop.
 *
 * Flood-fills transparency inward from the border rather than thresholding on
 * brightness. A brightness threshold would also punch through the pale clock
 * face and the light page edges of the books — anything enclosed by the
 * silhouette has to survive, and only background *connected to the edge* may
 * be removed.
 *
 * Usage: node scripts/cutout-figure.mjs <input> [output]
 */
import sharp from "sharp";

const input = process.argv[2];
const output = process.argv[3] ?? "public/figure.webp";
if (!input) {
  console.error("usage: node scripts/cutout-figure.mjs <input.png> [output.webp]");
  process.exit(1);
}

/** How far a pixel may stray from the sampled backdrop and still count as it. */
const TOLERANCE = 34;
/** Width of the fade at the silhouette edge, in tolerance units. */
const FEATHER = 16;

const src = sharp(input).ensureAlpha();
const { width, height } = await src.metadata();
const { data } = await src.raw().toBuffer({ resolveWithObject: true });

// Backdrop colour, averaged over the four corners so a single noisy pixel
// cannot define it.
const corners = [
  [2, 2],
  [width - 3, 2],
  [2, height - 3],
  [width - 3, height - 3],
];
const bg = [0, 0, 0];
for (const [x, y] of corners) {
  const i = (y * width + x) * 4;
  bg[0] += data[i] / 4;
  bg[1] += data[i + 1] / 4;
  bg[2] += data[i + 2] / 4;
}

const dist = (i) =>
  Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);

// BFS from every border pixel through anything close enough to the backdrop.
const visited = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;

const push = (x, y) => {
  const p = y * width + x;
  if (visited[p]) return;
  if (dist(p * 4) > TOLERANCE + FEATHER) return;
  visited[p] = 1;
  queue[tail++] = p;
};

for (let x = 0; x < width; x++) {
  push(x, 0);
  push(x, height - 1);
}
for (let y = 0; y < height; y++) {
  push(0, y);
  push(width - 1, y);
}

while (head < tail) {
  const p = queue[head++];
  const x = p % width;
  const y = (p / width) | 0;
  if (x > 0) push(x - 1, y);
  if (x < width - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1);
  if (y < height - 1) push(x, y + 1);
}

// Reachable background goes transparent, with a soft ramp across the boundary
// so the silhouette does not alias into a hard cut.
let kept = 0;
for (let p = 0; p < width * height; p++) {
  if (!visited[p]) {
    kept++;
    continue;
  }
  const d = dist(p * 4);
  const alpha = Math.round(Math.max(0, Math.min(1, (d - TOLERANCE) / FEATHER)) * 255);
  data[p * 4 + 3] = alpha;
  if (alpha > 0) kept++;
}

const out = await sharp(data, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 1 })
  .resize({ width: 900, withoutEnlargement: true })
  .webp({ quality: 92, alphaQuality: 100 })
  .toBuffer({ resolveWithObject: true });

await sharp(out.data).toFile(output);

console.log(
  `${input}\n  ${width}x${height} -> ${out.info.width}x${out.info.height}` +
    `\n  kept ${((kept / (width * height)) * 100).toFixed(1)}% of pixels` +
    `\n  ${(out.info.size / 1024).toFixed(0)} KB -> ${output}`,
);
