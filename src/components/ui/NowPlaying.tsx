"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { music } from "@/data/music";
import { ENTER_EVENT } from "@/lib/scene-state";

/**
 * The track in the corner: the whole song, with controls that work.
 *
 * This is a YouTube embed driven by the IFrame Player API, which is the part
 * that makes it viable — unlike Apple's embed, the parent page can start it,
 * pause it and set its volume. That is what finally allows a full track
 * instead of a thirty-second preview on a loop.
 *
 * The video stays visible on purpose. YouTube's API terms forbid hiding the
 * player or using it as a detached audio source, so the corner holds a small
 * video rather than the invisible `<audio>` element this replaced. Shrinking
 * it to nothing would be a licence violation, not a design choice.
 *
 * Sound waits for a gesture, because every browser insists on one. The opening
 * curtain is the intended source of it; landing straight on a section skips
 * the curtain, so a one-shot listener catches the first click there instead.
 *
 * Mounted in the root layout, so playback carries across navigation.
 */

const VOLUME_KEY = "atelier:volume";
const MUTED_KEY = "atelier:muted";

/** Just enough of the IFrame API to drive it, without pulling in the typings. */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(v: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number };
}
type WindowWithYT = Window & {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
};

/** Loads the IFrame API once per page, however many players ask for it. */
function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as WindowWithYT;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  return new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve((window as WindowWithYT).YT as YTNamespace);
    };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

/**
 * False during server render, true on the client, with no effect and no
 * setState — which is what lets the saved volume be read straight into initial
 * state without risking a hydration mismatch.
 */
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

function storedNumber(key: string, fallback: number) {
  const raw = Number(localStorage.getItem(key));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function NowPlaying() {
  const mounted = useMounted();
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState<number>(() =>
    typeof window === "undefined" ? music.defaultVolume : storedNumber(VOLUME_KEY, music.defaultVolume),
  );
  const [muted, setMuted] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(MUTED_KEY) === "1",
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!mounted || !host.current) return;
    let disposed = false;
    let instance: YTPlayer | null = null;

    loadYouTubeApi().then((YT) => {
      if (disposed || !host.current) return;
      instance = new YT.Player(host.current, {
        videoId: music.videoId,
        // The privacy-preserving host: nothing is written until playback
        // actually begins.
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          // A single-video playlist is the only way to make one track loop.
          loop: 1,
          playlist: music.videoId,
        },
        events: {
          onReady: () => {
            if (disposed) return;
            instance?.setVolume(Math.round(volume * 100));
            if (muted) instance?.mute();
            player.current = instance;
            setReady(true);
          },
          onStateChange: (e: { data: number }) => {
            if (!disposed) setPlaying(e.data === YT.PlayerState.PLAYING);
          },
        },
      });
    });

    return () => {
      disposed = true;
      instance?.destroy();
      player.current = null;
    };
    // Volume and muted are read once to seed the player; later changes go
    // through their own effects rather than rebuilding the whole embed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!ready) return;
    player.current?.setVolume(Math.round(volume * 100));
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume, ready]);

  useEffect(() => {
    if (!ready) return;
    if (muted) player.current?.mute();
    else player.current?.unMute();
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  }, [muted, ready]);

  // The curtain's click is the gesture that lets sound through. Anyone who
  // landed on a section never saw it, so their first interaction stands in.
  useEffect(() => {
    if (!ready) return;
    const start = () => player.current?.playVideo();
    window.addEventListener(ENTER_EVENT, start);
    const once = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", start, once);
    window.addEventListener("keydown", start, once);
    return () => {
      window.removeEventListener(ENTER_EVENT, start);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [ready]);

  const toggle = useCallback(() => {
    if (playing) player.current?.pauseVideo();
    else player.current?.playVideo();
  }, [playing]);

  if (!mounted) return null;

  return (
    /* Right edge, vertically centred — measured, not guessed. The hub puts an
       object and a label in all four corners, and a card tall enough to hold a
       video fouled whichever one it sat beside. The gap between the two bottom
       labels is 140px; this card is wider than that. The right flank between
       the Craft label (ends y309) and the Contact label (starts y705) is the
       one region the composition genuinely leaves open. */
    <div
      className="pointer-events-auto fixed right-5 top-1/2 z-50 w-[250px] -translate-y-1/2 overflow-hidden rounded-2xl border border-rule bg-surface/85 shadow-[0_1px_2px_rgb(87_75_59_/_0.05),0_16px_40px_-20px_rgb(87_75_59_/_0.35)] backdrop-blur-md"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{ transition: "box-shadow 400ms var(--ease-out-expo)" }}
    >
      <div className="flex items-stretch gap-2.5 p-2">
        {/* Kept visible and unobscured, as YouTube's terms require. */}
        <div className="relative aspect-video w-[108px] shrink-0 overflow-hidden rounded-lg bg-paper">
          <div ref={host} className="absolute inset-0 h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
          {!ready && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">···</span>
            </div>
          )}
        </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center pr-1">
        <div className="flex items-center gap-2">
          <span className="flex h-3 items-end gap-[2px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-[2px] rounded-full bg-moss"
                style={{
                  height: playing && !muted ? 12 : 3,
                  animation:
                    playing && !muted ? `equaliser 900ms ease-in-out ${i * 140}ms infinite` : undefined,
                  transition: "height 300ms var(--ease-out-expo)",
                }}
              />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            {/* Wraps rather than truncates: at this width a single line cut
                the title to "not a…", which tells the listener nothing. */}
            <span className="block text-[11.5px] leading-[1.25] text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
              {music.title}
            </span>
            <span className="block truncate text-[10px] leading-tight text-muted">{music.artist}</span>
          </span>
          <button
            onClick={toggle}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-rule text-[10px] text-ink transition-colors duration-300 hover:border-moss hover:text-moss"
            aria-label={playing ? "Pause music" : "Play music"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
        </div>

        {/* Volume unrolls on hover: a slider parked permanently in the corner of
            every page is clutter for a control most people touch once. */}
        <div
          className="flex items-center overflow-hidden"
          style={{
            height: expanded ? 22 : 0,
            opacity: expanded ? 1 : 0,
            transition: "height 380ms var(--ease-out-expo), opacity 300ms var(--ease-out-expo)",
          }}
        >
          <button
            onClick={() => setMuted((m) => !m)}
            className="mr-1.5 shrink-0 text-[11px] text-muted transition-colors hover:text-ink"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted || volume === 0 ? "🔇" : "🔊"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-[3px] w-full cursor-pointer accent-[#50501d]"
            aria-label="Volume"
          />
          <a
            href={music.watchUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-2 shrink-0 text-[10px] text-faint transition-colors hover:text-moss"
            title="Open on YouTube"
          >
            ↗
          </a>
        </div>
      </div>
      </div>
    </div>
  );
}
