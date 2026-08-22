/**
 * Build Moditium's shipped catalogue from the project's own dataset.
 *
 * The source is the 114,000-track feature set the original system was trained
 * against (`cashewwww14/Spotify → dataset.csv`). Shipping all of it to the
 * browser would be 20 MB, and most of it is redundant: what the recommender
 * needs is coverage of the *feature space*, not volume. So this stratifies the
 * energy × valence plane and takes the most recognisable track from each cell,
 * which keeps every mood reachable while fitting in a small JSON.
 *
 * Recognisability matters because each track has to be found again in the
 * Apple Music catalogue to get a preview URL.
 *
 * Usage: node scripts/build-catalogue.mjs <dataset.csv>
 */
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const input = process.argv[2];
const output = "src/data/moditium-catalogue.json";
if (!input) {
  console.error("usage: node scripts/build-catalogue.mjs <dataset.csv>");
  process.exit(1);
}

const GRID = 7; // energy × valence cells
const PER_CELL = 9;
const MIN_POPULARITY = 55;

/** Split a CSV line, honouring quoted fields containing commas. */
function splitCsv(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const rl = createInterface({ input: createReadStream(input), crlfDelay: Infinity });
let header = null;
let col = {};
const cells = new Map();
const seen = new Set();
let total = 0;

for await (const line of rl) {
  if (!header) {
    header = splitCsv(line);
    header.forEach((h, i) => (col[h] = i));
    continue;
  }
  const f = splitCsv(line);
  if (f.length < header.length) continue;

  const popularity = Number(f[col.popularity]);
  if (!Number.isFinite(popularity) || popularity < MIN_POPULARITY) continue;

  const name = f[col.track_name]?.trim();
  const artist = f[col.artists]?.split(";")[0]?.trim();
  if (!name || !artist) continue;

  // One entry per song: the dataset lists the same track under many genres.
  const key = `${name.toLowerCase()}|${artist.toLowerCase()}`;
  if (seen.has(key)) continue;
  seen.add(key);
  total++;

  const energy = clamp01(Number(f[col.energy]));
  const valence = clamp01(Number(f[col.valence]));
  const track = {
    n: name,
    a: artist,
    g: f[col.track_genre],
    p: popularity,
    d: Math.round(Number(f[col.duration_ms]) / 1000),
    f: {
      energy: +energy.toFixed(3),
      valence: +valence.toFixed(3),
      danceability: +clamp01(Number(f[col.danceability])).toFixed(3),
      // Tempo and loudness are the only two features not already 0..1 in the
      // source; the recommender's weighting assumes a common scale.
      tempo: +clamp01((Number(f[col.tempo]) - 50) / 150).toFixed(3),
      acousticness: +clamp01(Number(f[col.acousticness])).toFixed(3),
      instrumentalness: +clamp01(Number(f[col.instrumentalness])).toFixed(3),
      loudness: +clamp01((Number(f[col.loudness]) + 60) / 60).toFixed(3),
      speechiness: +clamp01(Number(f[col.speechiness])).toFixed(3),
      liveness: +clamp01(Number(f[col.liveness])).toFixed(3),
    },
  };

  const cx = Math.min(GRID - 1, Math.floor(energy * GRID));
  const cy = Math.min(GRID - 1, Math.floor(valence * GRID));
  const cellKey = `${cx},${cy}`;
  const bucket = cells.get(cellKey) ?? [];
  bucket.push(track);
  cells.set(cellKey, bucket);
}

const picked = [];
for (const [, bucket] of cells) {
  bucket.sort((a, b) => b.p - a.p);
  picked.push(...bucket.slice(0, PER_CELL));
}
picked.sort((a, b) => b.p - a.p);

await writeFile(output, JSON.stringify(picked));

const bytes = JSON.stringify(picked).length;
console.log(
  `read ${total.toLocaleString()} unique tracks (popularity >= ${MIN_POPULARITY})\n` +
    `kept ${picked.length} across ${cells.size} of ${GRID * GRID} energy x valence cells\n` +
    `${(bytes / 1024).toFixed(0)} KB -> ${output}`,
);
