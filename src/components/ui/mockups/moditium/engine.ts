import catalogue from "@/data/moditium-catalogue.json";

/**
 * The recommendation engine, running for real.
 *
 * This is the pipeline from the project's own architecture notes: rules narrow
 * the candidate set, case-based reasoning scores similarity with a hybrid
 * metric, and a ranker decides the final order. The weights and the 0.7/0.3
 * split are the ones the original documented.
 *
 * The catalogue is real too — 428 tracks lifted from the same 114,000-row
 * feature set the original was built against, stratified across the energy ×
 * valence plane by `scripts/build-catalogue.mjs` so every mood stays reachable.
 */

export const FEATURES = [
  "energy",
  "valence",
  "danceability",
  "tempo",
  "acousticness",
  "instrumentalness",
  "loudness",
  "speechiness",
  "liveness",
] as const;

export type Feature = (typeof FEATURES)[number];
export type Vector = Record<Feature, number>;

/** Learned from importance analysis in the original system. */
export const WEIGHTS: Vector = {
  energy: 0.15,
  valence: 0.15,
  danceability: 0.15,
  tempo: 0.12,
  acousticness: 0.1,
  instrumentalness: 0.1,
  loudness: 0.08,
  speechiness: 0.08,
  liveness: 0.07,
};

interface RawTrack {
  n: string;
  a: string;
  g: string;
  p: number;
  d: number;
  f: Vector;
  /**
   * Album, preview, artwork and store link — present only once
   * `scripts/enrich-catalogue.mjs` has been run against the catalogue. Optional
   * on purpose: the page must work either way, resolving on demand when these
   * are missing.
   */
  al?: string | null;
  pv?: string;
  aw?: string | null;
  ap?: string | null;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  genre: string;
  popularity: number;
  seconds: number;
  /**
   * 30-second Apple preview, artwork and store link, when the catalogue has
   * been enriched. Undefined means "look it up when this track is played".
   */
  previewUrl?: string;
  artworkUrl?: string | null;
  appleUrl?: string | null;
  f: Vector;
}

export const CATALOGUE: Track[] = (catalogue as RawTrack[]).map((t, i) => ({
  id: `t${i}`,
  title: t.n,
  artist: t.a,
  album: t.al,
  genre: t.g,
  popularity: t.p,
  seconds: t.d,
  previewUrl: t.pv,
  artworkUrl: t.aw,
  appleUrl: t.ap,
  f: t.f,
}));

/** Rule layer: hard filters that shrink the candidate set before scoring. */
export interface Rules {
  /** Exclude anything more "live" than this — the RBR stage in the original. */
  maxLiveness: number;
  /** Require real instrumental content when the listener wants focus. */
  instrumentalOnly: boolean;
  /** Optional genre narrowing. */
  genre: string | null;
}

export const DEFAULT_RULES: Rules = {
  maxLiveness: 0.8,
  instrumentalOnly: false,
  genre: null,
};

export const GENRES = [...new Set(CATALOGUE.map((t) => t.genre))].sort();

function weightedCosine(a: Vector, b: Vector) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of FEATURES) {
    const w = WEIGHTS[k];
    dot += w * a[k] * b[k];
    na += w * a[k] * a[k];
    nb += w * b[k] * b[k];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function weightedEuclidean(a: Vector, b: Vector) {
  let sum = 0;
  let maxSum = 0;
  for (const k of FEATURES) {
    sum += WEIGHTS[k] * (a[k] - b[k]) ** 2;
    maxSum += WEIGHTS[k]; // worst case per dimension is a difference of 1
  }
  // Normalised to 0..1 and inverted, as the original documented.
  return 1 - Math.sqrt(sum) / Math.sqrt(maxSum);
}

/** combined = 0.7 × cosine + 0.3 × euclidean */
export function similarity(a: Vector, b: Vector) {
  return 0.7 * weightedCosine(a, b) + 0.3 * weightedEuclidean(a, b);
}

export interface Scored extends Track {
  match: number;
  /** What the ranker added on top of raw similarity, as a signed delta. */
  boost: number;
}

/**
 * Stand-in for the gradient-boosted ranker.
 *
 * The trained LightGBM model is not shipped here; this reproduces its *shape* —
 * a small monotone adjustment favouring familiar, groove-forward tracks and
 * penalising live recordings — so the third stage visibly does something
 * rather than being a label on a diagram.
 */
function rankerBoost(t: Track, query: Vector) {
  const groove = (t.f.danceability - 0.5) * 0.05;
  const familiar = (t.popularity / 100 - 0.5) * 0.04;
  const clarity = (1 - Math.abs(t.f.speechiness - query.speechiness)) * 0.015;
  const fatigue = t.f.liveness > 0.5 ? -0.03 : 0;
  return groove + familiar + clarity + fatigue;
}

function passesRules(t: Track, rules: Rules) {
  if (t.f.liveness > rules.maxLiveness) return false;
  if (rules.instrumentalOnly && t.f.instrumentalness < 0.4) return false;
  if (rules.genre && t.genre !== rules.genre) return false;
  return true;
}

export function recommend(query: Vector, rules: Rules, limit = 8): Scored[] {
  return CATALOGUE.filter((t) => passesRules(t, rules))
    .map((t) => {
      const boost = rankerBoost(t, query);
      return { ...t, match: Math.max(0, Math.min(1, similarity(query, t.f) + boost)), boost };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, limit);
}

export function candidateCount(rules: Rules) {
  return CATALOGUE.reduce((n, t) => n + (passesRules(t, rules) ? 1 : 0), 0);
}
