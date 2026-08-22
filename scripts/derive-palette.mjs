/**
 * Lift the sampled asset colours into a light-mode palette.
 *
 * The raw texture samples are dark because they carry baked shadow — the same
 * oak reads #7a6d5c in the map and pale honey under the light. So the hue and
 * chroma relationships are kept from the assets and only lightness is
 * re-stepped, then every pairing that will carry text is checked for contrast.
 *
 * Usage: node scripts/derive-palette.mjs
 */

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;

function hexToOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.substr(i, 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI];
}

function oklchToHex(L, C, H) {
  const h = (H * Math.PI) / 180;
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.round(Math.min(255, Math.max(0, linearToSrgb(v) * 255))));
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const relLum = (hex) => {
  const c = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.substr(i, 2), 16) / 255));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Hues taken straight from the sampled textures. */
const SOURCE = {
  moss: "#656633",       // signpost lichen — the greenest thing in the set
  olive: "#58553c",      // cabin timber in shade
  sage: "#998f76",       // signpost weathered stone
  oak: "#7a6d5c",        // workbench top
  walnut: "#604332",     // tool handles
  bone: "#c8beab",       // workbench highlight — the lightest sampled pixel
};

// Lightness ladder for a light-mode surface, plus a chroma trim: lifting a
// colour without pulling chroma back makes it read as neon rather than washed.
const STEPS = [
  ["50", 0.975, 0.28],
  ["100", 0.945, 0.4],
  ["200", 0.9, 0.55],
  ["300", 0.82, 0.75],
  ["400", 0.72, 0.95],
  ["500", 0.62, 1.05],
  ["600", 0.52, 1.05],
  ["700", 0.42, 1.0],
  ["800", 0.32, 0.9],
  ["900", 0.24, 0.8],
];

const ramps = {};
for (const [name, hex] of Object.entries(SOURCE)) {
  const [, C, H] = hexToOklch(hex);
  ramps[name] = Object.fromEntries(
    STEPS.map(([step, L, cMul]) => [step, oklchToHex(L, C * cMul, H)]),
  );
}

for (const [name, ramp] of Object.entries(ramps)) {
  console.log(
    `${name.padEnd(7)} ` +
      Object.entries(ramp)
        .map(([s, h]) => `${s}:${h}`)
        .join("  "),
  );
}

const surface = ramps.bone["50"];
const paper = ramps.bone["100"];
console.log(`\nsurface ${surface}   paper ${paper}\n`);

const checks = [
  ["ink on surface", ramps.olive["900"], surface],
  ["ink on paper", ramps.olive["900"], paper],
  ["body on surface", ramps.olive["800"], surface],
  ["muted on surface", ramps.olive["600"], surface],
  ["moss accent on surface", ramps.moss["700"], surface],
  ["walnut accent on surface", ramps.walnut["700"], surface],
  ["oak accent on surface", ramps.oak["700"], surface],
  ["surface on moss-700 (button)", surface, ramps.moss["700"]],
  ["hairline on surface", ramps.sage["300"], surface],
];

for (const [label, fg, bg] of checks) {
  const r = contrast(fg, bg);
  const verdict = r >= 4.5 ? "AA text" : r >= 3 ? "large/UI only" : "FAIL";
  console.log(`${label.padEnd(30)} ${fg} on ${bg}  ${r.toFixed(2)}:1  ${verdict}`);
}
