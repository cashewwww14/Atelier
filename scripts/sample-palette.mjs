/**
 * Pull the real colours out of the shipped models.
 *
 * The palette should not be invented next to the assets — it should be taken
 * from them. This reads each GLB's base-colour texture, drops near-black and
 * near-white pixels (shadow and blown highlight carry no hue), then clusters
 * what is left in OKLab so the reported colours match what the eye groups.
 *
 * Usage: node scripts/sample-palette.mjs
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import sharp from "sharp";

// Read the uncompressed source models rather than the shipped ones: their
// textures are plain PNG, so no meshopt decoder is needed, and the colours are
// the originals before any resizing or WebP quantisation.
const SRC = "/Users/ahmadzaky/Documents/Projects/Assets 3d";
const MODELS = [
  ["Kabin bengkel", "kabin-bengkel"],
  ["Meja kerja", "meja-kerja"],
  ["Dinding perkakas", "dinding-perkakas"],
  ["Tiang penunjuk", "tiang-penunjuk"],
];
const CLUSTERS = 6;

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function rgbToOklab(r, g, b) {
  const R = srgbToLinear(r / 255);
  const G = srgbToLinear(g / 255);
  const B = srgbToLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const hex = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** k-means in OKLab, seeded deterministically so runs are comparable. */
function cluster(pixels, k) {
  const labs = pixels.map(([r, g, b]) => rgbToOklab(r, g, b));
  let centres = Array.from({ length: k }, (_, i) => labs[Math.floor((i / k) * labs.length)]);

  for (let iter = 0; iter < 24; iter++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < labs.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d =
          (labs[i][0] - centres[c][0]) ** 2 +
          (labs[i][1] - centres[c][1]) ** 2 +
          (labs[i][2] - centres[c][2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      sums[best][0] += pixels[i][0];
      sums[best][1] += pixels[i][1];
      sums[best][2] += pixels[i][2];
      sums[best][3]++;
      labs[i].owner = best;
    }
    centres = sums.map((s, i) =>
      s[3] ? rgbToOklab(s[0] / s[3], s[1] / s[3], s[2] / s[3]) : centres[i],
    );
    centres.counts = sums.map((s) => s[3]);
    centres.rgb = sums.map((s) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : [0, 0, 0]));
  }

  return centres.rgb
    .map((rgb, i) => ({ rgb, share: centres.counts[i] / pixels.length }))
    .filter((c) => c.share > 0.02)
    .sort((a, b) => b.share - a.share);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const [name, slug] of MODELS) {
  const doc = await io.read(`${SRC}/${name}.glb`);
  const textures = doc.getRoot().listTextures();

  // The base-colour map is the one that carries the object's actual colour;
  // normal and roughness maps would report blue and grey.
  const material = doc.getRoot().listMaterials()[0];
  const base = material?.getBaseColorTexture() ?? textures[0];
  if (!base) {
    console.log(`${slug}: no texture`);
    continue;
  }

  const { data, info } = await sharp(Buffer.from(base.getImage()))
    .resize(96, 96, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Skip crushed shadow and blown highlight — neither carries usable hue.
    if (max < 26 || min > 244) continue;
    pixels.push([r, g, b]);
  }

  console.log(`\n${slug}  (${info.width}x${info.height} sampled, ${pixels.length} px kept)`);
  for (const c of cluster(pixels, CLUSTERS)) {
    console.log(`   ${hex(c.rgb)}   ${(c.share * 100).toFixed(1).padStart(5)}%`);
  }
}
