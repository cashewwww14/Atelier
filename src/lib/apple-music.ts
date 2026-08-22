import { createSign } from "node:crypto";

/**
 * Resolve a dataset track to a real Apple recording: 30-second preview, cover
 * art, and a link to the store page.
 *
 * Two sources, in order:
 *
 *  1. **iTunes Search** — public, free, unauthenticated, and the same catalogue
 *     Apple Music serves. This is the default and needs no account at all.
 *  2. **Apple Music API** — used instead when a MusicKit developer token is
 *     configured. Better matching and canonical Apple Music URLs, but it needs
 *     a paid developer account, so it is an upgrade rather than a requirement.
 *
 * Either way the credentials stay on the server; `app/api/preview/route.ts` is
 * the only consumer.
 */

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

export interface PreviewResult {
  title: string;
  artist: string;
  album: string | null;
  /** 30-second AAC clip, playable without authentication. */
  previewUrl: string | null;
  artworkUrl: string | null;
  appleUrl: string | null;
  source: "itunes" | "musickit";
  /** 0..1 confidence that this is the right recording. */
  confidence: number;
}

export function hasMusicKit() {
  return Boolean(
    process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY,
  );
}

/* ------------------------------------------------------------------ matching */

/**
 * Normalise a title for comparison: case, punctuation, and the bracketed
 * suffixes labels love to add ("- 2011 Remaster", "(feat. …)").
 */
function normalise(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\s-\s.*$/, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Re-recordings that share a title but are not the track we asked for. */
const IMPOSTORS = /\b(karaoke|tribute|cover|made famous|originally performed|instrumental version|as made popular)\b/i;

interface Candidate {
  title: string;
  artist: string;
  album: string | null;
  previewUrl: string | null;
  artworkUrl: string | null;
  appleUrl: string | null;
}

/**
 * Score a candidate against what was asked for.
 *
 * Search relevance alone is not enough — asking for "As It Was" by Harry Styles
 * returns his recording *and* a cover by someone else, and a portfolio that
 * plays the cover looks broken. Artist agreement is weighted heaviest because
 * that is what actually separates the two.
 */
function score(candidate: Candidate, title: string, artist: string) {
  const wantTitle = normalise(title);
  const wantArtist = normalise(artist);
  const gotTitle = normalise(candidate.title);
  const gotArtist = normalise(candidate.artist);

  let titleScore = 0;
  if (gotTitle === wantTitle) titleScore = 0.45;
  else if (gotTitle.includes(wantTitle) || wantTitle.includes(gotTitle)) titleScore = 0.28;

  // A title that does not match at all disqualifies the result outright.
  // Search relevance will happily return a different song by the right artist
  // — asking for "Yonaguni" by Bad Bunny returns "NUEVAYoL" — and scoring that
  // additively let a strong artist match carry a completely wrong track.
  if (titleScore === 0) return 0;

  let artistScore = 0;
  if (gotArtist === wantArtist) artistScore = 0.5;
  else if (gotArtist.includes(wantArtist) || wantArtist.includes(gotArtist)) artistScore = 0.34;

  let s = titleScore + artistScore;
  if (IMPOSTORS.test(candidate.title) || IMPOSTORS.test(candidate.album ?? "")) s -= 0.6;
  if (!candidate.previewUrl) s -= 0.35;

  return Math.max(0, Math.min(1, s));
}

/** Below this, the match is not trustworthy enough to play. */
const MIN_CONFIDENCE = 0.62;

function pickBest(candidates: Candidate[], title: string, artist: string) {
  let best: Candidate | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = score(c, title, artist);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return { best, confidence: bestScore };
}

/* ------------------------------------------------------------- iTunes Search */

interface ITunesResult {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

async function fetchITunes(term: string, country: string): Promise<Candidate[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", term);
  url.searchParams.set("entity", "song");
  url.searchParams.set("country", country);
  // Enough candidates to step past covers and karaoke in one call.
  url.searchParams.set("limit", "10");

  const res = await fetch(url, { next: { revalidate: 604_800 } });
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);

  const body = (await res.json()) as { results?: ITunesResult[] };
  return (body.results ?? []).map((r) => ({
    title: r.trackName ?? "",
    artist: r.artistName ?? "",
    album: r.collectionName ?? null,
    previewUrl: r.previewUrl ?? null,
    // The artwork URL carries its size in the path; 100px is a thumbnail.
    artworkUrl: r.artworkUrl100?.replace("100x100bb", "300x300bb") ?? null,
    appleUrl: r.trackViewUrl ?? null,
  }));
}

async function searchITunes(title: string, artist: string): Promise<PreviewResult | null> {
  const country = process.env.APPLE_STOREFRONT ?? "us";

  // Two passes. The combined term is the most precise, but when a track is
  // missing from a storefront the search silently returns other songs by the
  // same artist instead; a title-only pass sometimes turns up the real
  // recording that the combined query buried.
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const term of [`${title} ${artist}`, title]) {
    for (const c of await fetchITunes(term, country)) {
      const key = `${c.title}|${c.artist}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(c);
    }
    const interim = pickBest(candidates, title, artist);
    // Stop early once something is clearly right.
    if (interim.confidence >= 0.9) break;
  }

  const { best, confidence } = pickBest(candidates, title, artist);
  if (!best || confidence < MIN_CONFIDENCE) return null;

  return { ...best, source: "itunes", confidence };
}

/* --------------------------------------------------------- Apple Music (JWT) */

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

let cachedToken: { value: string; expires: number } | null = null;

/**
 * Signed ES256 developer token.
 *
 * This one *is* meant to reach the browser — MusicKit JS authenticates with it
 * — but it is short-lived and derived, and the .p8 private key it is signed
 * with never leaves the server.
 */
export function developerToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expires > now + 60) return cachedToken.value;

  const teamId = process.env.APPLE_TEAM_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  // Env files store the PEM with escaped newlines; restore them.
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  const expires = now + TOKEN_TTL_SECONDS;
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: now, exp: expires }));

  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  // JWS wants the raw r‖s pair, not the DER wrapper OpenSSL emits by default.
  const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

  const token = `${header}.${payload}.${b64url(signature)}`;
  cachedToken = { value: token, expires };
  return token;
}

interface AppleSong {
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    url?: string;
    previews?: { url?: string }[];
    artwork?: { url?: string };
  };
}

async function searchMusicKit(title: string, artist: string): Promise<PreviewResult | null> {
  const storefront = process.env.APPLE_STOREFRONT ?? "us";
  const url = new URL(`https://api.music.apple.com/v1/catalog/${storefront}/search`);
  url.searchParams.set("term", `${title} ${artist}`);
  url.searchParams.set("types", "songs");
  url.searchParams.set("limit", "8");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${developerToken()}` },
    next: { revalidate: 604_800 },
  });
  if (!res.ok) throw new Error(`Apple Music search failed: ${res.status}`);

  const body = (await res.json()) as { results?: { songs?: { data?: AppleSong[] } } };
  const candidates: Candidate[] = (body.results?.songs?.data ?? []).map((d) => ({
    title: d.attributes?.name ?? "",
    artist: d.attributes?.artistName ?? "",
    album: d.attributes?.albumName ?? null,
    previewUrl: d.attributes?.previews?.[0]?.url ?? null,
    // The artwork URL is a template with {w}/{h} placeholders.
    artworkUrl:
      d.attributes?.artwork?.url?.replace("{w}", "300").replace("{h}", "300") ?? null,
    appleUrl: d.attributes?.url ?? null,
  }));

  const { best, confidence } = pickBest(candidates, title, artist);
  if (!best || confidence < MIN_CONFIDENCE) return null;

  return { ...best, source: "musickit", confidence };
}

/* ---------------------------------------------------------------------- api */

/** Lookups are stable, so one per track per process is plenty. */
const cache = new Map<string, PreviewResult | null>();

export async function findPreview(title: string, artist: string) {
  const key = `${title}|${artist}`.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  let result: PreviewResult | null = null;
  if (hasMusicKit()) {
    try {
      result = await searchMusicKit(title, artist);
    } catch {
      // A misconfigured key should degrade to the free path, not break playback.
      result = null;
    }
  }
  if (!result) result = await searchITunes(title, artist);

  cache.set(key, result);
  return result;
}
