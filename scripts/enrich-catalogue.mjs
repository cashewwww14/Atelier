/**
 * Attach a real Apple recording — 30-second preview, cover art, store link —
 * to every track in the catalogue.
 *
 * Resolving at runtime works and is what the app falls back to, but doing it
 * ahead of time means no round trip before the first note and no grid of grey
 * placeholders while artwork arrives.
 *
 * iTunes Search rate-limits hard, and once tripped it returns 403 to
 * everything for a while. So this run is deliberately slow, backs off for a
 * long time when blocked, saves after every batch, and **resumes** — re-run it
 * as many times as it takes and it will only look up what is still missing.
 * Tracks it cannot match keep their entry and simply play synthesised.
 *
 * Usage: node scripts/enrich-catalogue.mjs [--force]
 */
import { readFile, writeFile } from "node:fs/promises";

const FILE = "src/data/moditium-catalogue.json";
const COUNTRY = process.env.APPLE_STOREFRONT ?? "us";
const MIN_CONFIDENCE = 0.62;

/** Polite spacing between lookups. iTunes tolerates roughly 20/minute. */
const DELAY_MS = 3200;
/** How long to wait out a 403 before trying again. */
const BLOCKED_MS = 90_000;
/** Give up on a track after this many blocked attempts. */
const MAX_BLOCKED = 4;
/** Write progress to disk this often, so a kill never costs the whole run. */
const SAVE_EVERY = 10;

const force = process.argv.includes("--force");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const normalise = (s) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\s-\s.*$/, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const IMPOSTORS =
  /\b(karaoke|tribute|cover|made famous|originally performed|instrumental version|as made popular)\b/i;

function score(candidate, title, artist) {
  const gotTitle = normalise(candidate.title);
  const wantTitle = normalise(title);

  let titleScore = 0;
  if (gotTitle === wantTitle) titleScore = 0.45;
  else if (gotTitle.includes(wantTitle) || wantTitle.includes(gotTitle)) titleScore = 0.28;
  // A wholly different title is never the right track, however well the artist
  // matches — search relevance loves to offer a label-mate instead.
  if (titleScore === 0) return 0;

  const gotArtist = normalise(candidate.artist);
  const wantArtist = normalise(artist);
  let artistScore = 0;
  if (gotArtist === wantArtist) artistScore = 0.5;
  else if (gotArtist.includes(wantArtist) || wantArtist.includes(gotArtist)) artistScore = 0.34;

  let s = titleScore + artistScore;
  if (IMPOSTORS.test(candidate.title) || IMPOSTORS.test(candidate.album ?? "")) s -= 0.6;
  if (!candidate.previewUrl) s -= 0.35;
  return Math.max(0, Math.min(1, s));
}

let blockedStreak = 0;

/** Returns candidates, or null when the API is refusing to talk to us. */
async function fetchITunes(term) {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", term);
  url.searchParams.set("entity", "song");
  url.searchParams.set("country", COUNTRY);
  url.searchParams.set("limit", "10");

  for (let attempt = 0; attempt <= MAX_BLOCKED; attempt++) {
    let res;
    try {
      res = await fetch(url);
    } catch {
      await sleep(5000);
      continue;
    }

    if (res.ok) {
      blockedStreak = 0;
      const body = await res.json();
      return (body.results ?? []).map((r) => ({
        title: r.trackName ?? "",
        artist: r.artistName ?? "",
        album: r.collectionName ?? null,
        previewUrl: r.previewUrl ?? null,
        artworkUrl: r.artworkUrl100?.replace("100x100bb", "300x300bb") ?? null,
        appleUrl: r.trackViewUrl ?? null,
      }));
    }

    if (res.status === 403 || res.status === 429) {
      blockedStreak++;
      process.stdout.write(
        `  rate limited (${res.status}); waiting ${BLOCKED_MS / 1000}s…\n`,
      );
      await sleep(BLOCKED_MS);
      continue;
    }

    return [];
  }
  return null;
}

async function resolve(title, artist) {
  const seen = new Set();
  const candidates = [];

  const best = () =>
    candidates.reduce(
      (acc, c) => {
        const s = score(c, title, artist);
        return s > acc.confidence ? { candidate: c, confidence: s } : acc;
      },
      { candidate: null, confidence: 0 },
    );

  // The combined term is the most precise; a title-only pass sometimes turns
  // up the real recording that the combined query buried.
  for (const term of [`${title} ${artist}`, title]) {
    const found = await fetchITunes(term);
    if (found === null) return null; // still blocked — stop, do not guess
    for (const c of found) {
      const key = `${c.title}|${c.artist}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(c);
    }
    if (best().confidence >= 0.9) break;
    await sleep(DELAY_MS);
  }

  return best();
}

const tracks = JSON.parse(await readFile(FILE, "utf8"));
const save = () => writeFile(FILE, JSON.stringify(tracks));

let matched = tracks.filter((t) => t.pv).length;
let attempted = 0;
let missed = 0;

console.log(
  `${tracks.length} tracks, ${matched} already matched · ` +
    `${DELAY_MS / 1000}s between lookups, storefront "${COUNTRY}"`,
);

for (const [i, t] of tracks.entries()) {
  // Resume: anything already resolved, or already tried and missed, is skipped
  // unless --force. That is what makes repeated runs cheap.
  if (!force && (t.pv || t.miss)) continue;

  const result = await resolve(t.n, t.a);

  if (result === null) {
    console.log(`\nStill blocked after ${MAX_BLOCKED} waits — stopping at ${i}/${tracks.length}.`);
    console.log("Progress is saved. Re-run later and it will pick up here.");
    break;
  }

  attempted++;
  const { candidate, confidence } = result;

  if (candidate && confidence >= MIN_CONFIDENCE && candidate.previewUrl) {
    // Prefer Apple's spelling — it is what the artwork and store page say.
    t.n = candidate.title;
    t.a = candidate.artist;
    t.al = candidate.album;
    t.pv = candidate.previewUrl;
    t.aw = candidate.artworkUrl;
    t.ap = candidate.appleUrl;
    delete t.miss;
    matched++;
  } else {
    // Remembered so a re-run does not spend requests on it again. The track
    // stays in the catalogue and simply plays synthesised.
    t.miss = 1;
    missed++;
  }

  if (attempted % SAVE_EVERY === 0) {
    await save();
    process.stdout.write(`  ${i + 1}/${tracks.length}  matched ${matched}  missed ${missed}\n`);
  }
  await sleep(DELAY_MS);
}

await save();

const bytes = JSON.stringify(tracks).length;
console.log(
  `\n${matched} of ${tracks.length} tracks have a preview` +
    ` (${tracks.length - matched} will play synthesised)\n` +
    `${(bytes / 1024).toFixed(0)} KB -> ${FILE}`,
);
if (blockedStreak > 0) console.log("Finished while rate limited — re-run to fill the gaps.");
