"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INK, Panel, Slider } from "./shared";
import { ModitiumSynth } from "./moditium/audio";
import {
  CATALOGUE,
  DEFAULT_RULES,
  FEATURES,
  GENRES,
  candidateCount,
  recommend,
  WEIGHTS,
  type Rules,
  type Scored,
  type Vector,
} from "./moditium/engine";

const ACCENT = "#8A4A7D";

const START: Vector = {
  energy: 0.68,
  valence: 0.42,
  danceability: 0.55,
  tempo: 0.61,
  acousticness: 0.34,
  instrumentalness: 0.3,
  loudness: 0.6,
  speechiness: 0.1,
  liveness: 0.2,
};

/** The five a listener actually thinks in; the rest ride along in the maths. */
const VISIBLE: (keyof Vector)[] = ["energy", "valence", "danceability", "tempo", "acousticness"];

/** What is currently making sound. */
type Source = "apple" | "synth" | "loading";

function Art({ src, alt, size = 42 }: { src?: string | null; alt: string; size?: number }) {
  if (!src) {
    return (
      <span
        className="block shrink-0 rounded-md"
        style={{ width: size, height: size, background: INK.panel }}
      />
    );
  }
  return (
    /* Apple's artwork CDN is not in the image config and these are already
       sized thumbnails, so next/image has nothing to add here. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className="block shrink-0 rounded-md object-cover"
      style={{ width: size, height: size, background: INK.panel }}
    />
  );
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ModitiumMockup() {
  const [query, setQuery] = useState<Vector>(START);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [nowPlaying, setNowPlaying] = useState<Scored | "mood" | null>(null);
  const [source, setSource] = useState<Source>("synth");
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  /** Artwork resolved on demand, for catalogues that have not been enriched. */
  const [artwork, setArtwork] = useState<Record<string, string>>({});

  const synth = useRef<ModitiumSynth | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const results = useMemo(() => recommend(query, rules), [query, rules]);
  const pool = useMemo(() => candidateCount(rules), [rules]);

  // One synth and one audio element for the component's lifetime.
  useEffect(() => {
    const s = new ModitiumSynth(START);
    s.onStep = ({ step: st }) => setStep(st);
    synth.current = s;

    const el = new Audio();
    el.preload = "none";
    el.addEventListener("timeupdate", () => setElapsed(el.currentTime));
    el.addEventListener("loadedmetadata", () => setDuration(el.duration));
    el.addEventListener("playing", () => setSource("apple"));
    el.addEventListener("ended", () => setNowPlaying(null));
    audio.current = el;

    return () => {
      s.dispose();
      el.pause();
      el.src = "";
    };
  }, []);

  const activeFeatures = nowPlaying === "mood" ? query : nowPlaying?.f;

  // Moving a slider while the synthesised mood preview plays re-tunes the
  // running audio instead of restarting it.
  useEffect(() => {
    if (activeFeatures && synth.current?.playing) synth.current.update(activeFeatures);
  }, [activeFeatures]);

  const stopAll = useCallback(() => {
    synth.current?.stop();
    audio.current?.pause();
  }, []);

  const play = useCallback(
    async (target: Scored | "mood") => {
      const same =
        nowPlaying === target ||
        (nowPlaying !== "mood" && target !== "mood" && nowPlaying?.id === target.id);
      const sounding =
        Boolean(synth.current?.playing) || Boolean(audio.current && !audio.current.paused);

      if (same && sounding) {
        stopAll();
        setNowPlaying(null);
        return;
      }

      stopAll();
      setNowPlaying(target);
      setElapsed(0);

      // The mood preview is the query itself — there is no recording of it, so
      // it is always the synthesiser.
      if (target === "mood") {
        setSource("synth");
        setDuration(0);
        synth.current?.update(query);
        synth.current?.setRoot(220);
        if (!synth.current?.playing) await synth.current?.start();
        return;
      }

      setSource("loading");

      // Prefer the URL baked in by scripts/enrich-catalogue.mjs; fall back to
      // asking the server, which is what happens before that script has run.
      let url = target.previewUrl;
      if (!url) {
        try {
          const res = await fetch(
            `/api/preview?title=${encodeURIComponent(target.title)}&artist=${encodeURIComponent(target.artist)}`,
          );
          if (res.ok) {
            const data = (await res.json()) as { previewUrl?: string; artworkUrl?: string | null };
            url = data.previewUrl ?? undefined;
            if (data.artworkUrl) setArtwork((a) => ({ ...a, [target.id]: data.artworkUrl! }));
          }
        } catch {
          // Offline or rate-limited upstream — the synth still has this covered.
        }
      }

      const el = audio.current;
      if (el && url) {
        el.src = url;
        try {
          await el.play();
          return;
        } catch {
          // Autoplay policy or an expired asset — fall through rather than
          // leaving the listener with silence.
        }
      }

      setSource("synth");
      setDuration(0);
      synth.current?.update(target.f);
      synth.current?.setRoot(165 + (target.title.length * 7) % 90);
      if (!synth.current?.playing) await synth.current?.start();
    },
    [nowPlaying, query, stopAll],
  );

  // Cover art for whatever is on screen, fetched before anyone presses play.
  // Tracks that have been through scripts/enrich-catalogue.mjs already carry
  // their artwork; this covers the ones that have not, one at a time so a
  // fresh list does not fire eight parallel requests at a rate-limited API.
  useEffect(() => {
    const missing = results.filter((r) => !r.artworkUrl && !artwork[r.id]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const track of missing) {
        if (cancelled) return;
        try {
          const res = await fetch(
            `/api/preview?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`,
          );
          if (!res.ok) continue;
          const data = (await res.json()) as { artworkUrl?: string | null };
          if (!cancelled && data.artworkUrl) {
            setArtwork((a) => ({ ...a, [track.id]: data.artworkUrl! }));
          }
        } catch {
          // Offline or throttled — the placeholder tile stays, nothing breaks.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [results, artwork]);

  const set = (k: keyof Vector, v: number) => setQuery((q) => ({ ...q, [k]: v }));

  const playingId = nowPlaying && nowPlaying !== "mood" ? nowPlaying.id : null;
  const isPlaying = Boolean(nowPlaying);
  const total = nowPlaying === "mood" ? 0 : duration || 30;

  return (
    <div className="flex h-full w-full flex-col" style={{ background: INK.bg, color: INK.ink }}>
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{ borderBottom: `1px solid ${INK.line}` }}
      >
        <div className="flex items-baseline gap-3">
          <h1 className="text-[21px] font-semibold tracking-[-0.02em]">Moditium</h1>
          <span className="text-[12px]" style={{ color: INK.muted }}>
            mood-first recommendations
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-3 py-1 font-mono text-[10.5px]"
            style={{ background: INK.panel, color: INK.muted }}
          >
            {pool} of {CATALOGUE.length} pass the rules
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px]"
            style={{ background: "#f3e7f1", color: ACCENT }}
          >
            ♫ Apple previews · 30s
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-5 px-8 py-6">
        <div className="flex w-[288px] shrink-0 flex-col gap-4">
          <Panel className="px-4 py-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[12.5px] font-medium">Set the mood</p>
              <button
                onClick={() => play("mood")}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-85"
                style={{ background: ACCENT, color: "#fff" }}
              >
                {nowPlaying === "mood" ? "■ Stop" : "▶ Hear it"}
              </button>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: INK.muted }}>
              These nine numbers are what the recommender reasons about.
            </p>

            <div className="mt-4 space-y-3.5">
              {VISIBLE.map((k) => (
                <Slider
                  key={k}
                  label={k}
                  value={query[k]}
                  onChange={(v) => set(k, v)}
                  accent={ACCENT}
                  readout={query[k].toFixed(2)}
                />
              ))}
            </div>

            <div className="mt-5 space-y-2.5 border-t pt-4" style={{ borderColor: INK.line }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: INK.faint }}>
                Rules (RBR)
              </p>

              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-[11.5px]" style={{ color: INK.secondary }}>
                  Max liveness
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={rules.maxLiveness}
                    onChange={(e) => setRules((r) => ({ ...r, maxLiveness: Number(e.target.value) }))}
                    className="w-[80px] accent-[#8A4A7D]"
                  />
                  <span className="w-[26px] font-mono text-[10.5px] tabular-nums">
                    {rules.maxLiveness.toFixed(2)}
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-[11.5px]" style={{ color: INK.secondary }}>
                  Instrumental only
                </span>
                <button
                  onClick={() => setRules((r) => ({ ...r, instrumentalOnly: !r.instrumentalOnly }))}
                  className="relative h-[18px] w-[32px] rounded-full transition-colors"
                  style={{ background: rules.instrumentalOnly ? ACCENT : "#ded8ca" }}
                  aria-pressed={rules.instrumentalOnly}
                >
                  <span
                    className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all"
                    style={{ left: rules.instrumentalOnly ? 16 : 2 }}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between gap-3">
                <span className="text-[11.5px]" style={{ color: INK.secondary }}>
                  Genre
                </span>
                <select
                  value={rules.genre ?? ""}
                  onChange={(e) => setRules((r) => ({ ...r, genre: e.target.value || null }))}
                  className="w-[132px] rounded-md px-2 py-1 text-[11px]"
                  style={{ background: "#fff", border: `1px solid ${INK.line}`, color: INK.ink }}
                >
                  <option value="">any</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Panel>

          <Panel className="min-h-0 flex-1 px-4 py-4">
            <p className="text-[12.5px] font-medium">CBR feature weights</p>
            <p className="mt-0.5 text-[11px]" style={{ color: INK.muted }}>
              0.7 × cosine + 0.3 × euclidean
            </p>

            <div className="mt-3.5 space-y-[9px]">
              {FEATURES.map((k) => (
                <div key={k} className="flex items-center gap-2.5">
                  <span className="w-[100px] shrink-0 truncate text-[10.5px]" style={{ color: INK.secondary }}>
                    {k}
                  </span>
                  <span className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: INK.panel }}>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(WEIGHTS[k] / 0.15) * 100}%`, background: ACCENT }}
                    />
                  </span>
                  <span className="w-[30px] shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: INK.faint }}>
                    {WEIGHTS[k].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline justify-between">
            <p className="text-[14px] font-semibold">Top {results.length}</p>
            <div className="flex gap-1.5">
              {["RBR", "CBR", "LightGBM"].map((stage, i) => (
                <span
                  key={stage}
                  className="rounded-md px-2.5 py-[3px] font-mono text-[10px]"
                  style={{ background: ["#f6eef5", "#f1e4ef", "#ecdaea"][i], color: ACCENT }}
                >
                  {stage}
                </span>
              ))}
            </div>
          </div>

          <Panel className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {results.map((r, i) => {
              const active = playingId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => play(r)}
                  className="flex w-full items-center gap-3.5 px-4 py-[11px] text-left transition-colors"
                  style={{
                    borderBottom: i < results.length - 1 ? `1px solid ${INK.line}` : "none",
                    background: active ? "#faf2f8" : "transparent",
                  }}
                >
                  <span
                    className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full font-mono text-[10px]"
                    style={{
                      background: active ? ACCENT : "transparent",
                      color: active ? "#fff" : INK.faint,
                    }}
                  >
                    {active && isPlaying ? "❚❚" : i + 1}
                  </span>

                  <Art src={r.artworkUrl ?? artwork[r.id]} alt={`${r.title} cover art`} />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px]">{r.title}</span>
                    <span className="block truncate text-[11.5px]" style={{ color: INK.muted }}>
                      {r.artist} · {r.genre}
                    </span>
                  </span>

                  <span className="w-[134px] shrink-0">
                    <span className="flex items-baseline justify-between">
                      <span className="text-[10px]" style={{ color: INK.faint }}>
                        similarity
                      </span>
                      <span className="font-mono text-[11.5px] tabular-nums">
                        {(r.match * 100).toFixed(1)}%
                      </span>
                    </span>
                    <span className="mt-1 block h-[4px] overflow-hidden rounded-full" style={{ background: INK.panel }}>
                      <span
                        className="block h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${r.match * 100}%`, background: ACCENT }}
                      />
                    </span>
                  </span>

                  <span className="w-[38px] shrink-0 text-right font-mono text-[11px]" style={{ color: INK.faint }}>
                    {mmss(r.seconds)}
                  </span>
                </button>
              );
            })}

            {results.length === 0 && (
              <p className="px-4 py-10 text-center text-[13px]" style={{ color: INK.muted }}>
                Nothing passes those rules. Loosen the liveness cap or clear the genre.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <div
        className="flex items-center gap-4 px-8 py-3.5"
        style={{ borderTop: `1px solid ${INK.line}`, background: INK.panel }}
      >
        <Art
          src={
            nowPlaying && nowPlaying !== "mood"
              ? (nowPlaying.artworkUrl ?? artwork[nowPlaying.id])
              : null
          }
          alt=""
          size={38}
        />

        <div className="w-[186px] min-w-0">
          <p className="truncate text-[12.5px]">
            {nowPlaying === "mood" ? "Your mood" : nowPlaying ? nowPlaying.title : "Nothing playing"}
          </p>
          <p className="truncate text-[11px]" style={{ color: INK.muted }}>
            {nowPlaying === "mood"
              ? "generated from the sliders"
              : nowPlaying
                ? nowPlaying.artist
                : "pick a track"}
          </p>
        </div>

        <button
          onClick={() => nowPlaying && play(nowPlaying)}
          disabled={!nowPlaying}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] transition-opacity disabled:opacity-35"
          style={{ background: ACCENT, color: "#fff" }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        {/* Sequencer position, shown only when the synth is the source. */}
        {source === "synth" && isPlaying && (
          <div className="flex shrink-0 items-end gap-[3px]">
            {Array.from({ length: 16 }, (_, i) => (
              <span
                key={i}
                className="block w-[3px] rounded-full transition-all duration-100"
                style={{
                  height: i === step ? 18 : i % 4 === 0 ? 10 : 6,
                  background: i === step ? ACCENT : "#ded8ca",
                }}
              />
            ))}
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="font-mono text-[10.5px]" style={{ color: INK.faint }}>
            {mmss(elapsed)}
          </span>
          <span className="h-[3px] flex-1 rounded-full" style={{ background: "#ded8ca" }}>
            <span
              className="block h-full rounded-full"
              style={{
                width: `${total ? Math.min(100, (elapsed / total) * 100) : 0}%`,
                background: ACCENT,
              }}
            />
          </span>
          <span className="font-mono text-[10.5px]" style={{ color: INK.faint }}>
            {nowPlaying === "mood" ? "∞" : mmss(total)}
          </span>
        </div>

        {nowPlaying && nowPlaying !== "mood" && nowPlaying.appleUrl ? (
          <a
            href={nowPlaying.appleUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 text-[10.5px] underline decoration-dotted underline-offset-2"
            style={{ color: INK.muted }}
          >
            {source === "loading" ? "loading…" : "open in Apple Music ↗"}
          </a>
        ) : (
          <span className="shrink-0 text-[10.5px]" style={{ color: INK.faint }}>
            synthesised from features
          </span>
        )}
      </div>
    </div>
  );
}
