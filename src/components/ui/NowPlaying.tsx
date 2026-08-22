"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { music } from "@/data/music";

/**
 * The track in the corner: starts itself, and can be paused or turned down.
 *
 * Owning the `<audio>` element is what makes those controls possible. Apple's
 * embed iframe plays the full song for a signed-in listener, but it is
 * cross-origin — nothing outside it can start it, pause it, or set its volume.
 * A player you can actually operate means Apple's public preview asset.
 *
 * "Autoplay" is honest about what browsers allow. Chrome and Safari refuse
 * audio until the visitor has interacted with the page, so this tries once on
 * mount and, if refused, arms a one-shot listener and starts at their first
 * click, key press or scroll. No prompt, no banner — it simply begins.
 *
 * Mounted in the root layout, so playback carries across navigation.
 */

const VOLUME_KEY = "atelier:volume";
const MUTED_KEY = "atelier:muted";

/**
 * False during server render, true on the client, with no effect and no
 * setState. An audio player has nothing to server-render, and skipping that
 * pass is what lets the saved volume be read straight into initial state
 * without risking a hydration mismatch.
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
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState<number>(() =>
    typeof window === "undefined" ? music.defaultVolume : storedNumber(VOLUME_KEY, music.defaultVolume),
  );
  const [muted, setMuted] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(MUTED_KEY) === "1",
  );
  const [expanded, setExpanded] = useState(false);

  // Build the element once. It is never attached to the DOM — it only needs to
  // exist — which also keeps it clear of React re-render churn.
  useEffect(() => {
    if (!mounted) return;

    const el = new Audio(music.src);
    el.loop = true;
    el.preload = "auto";
    el.volume = volume;
    el.muted = muted;
    el.addEventListener("play", () => setPlaying(true));
    el.addEventListener("pause", () => setPlaying(false));
    audio.current = el;

    let armed = false;
    const start = () => {
      el.play().catch(() => {
        // Still refused — wait for a real gesture and try once more.
        if (armed) return;
        armed = true;
        const kick = () => {
          el.play().catch(() => {});
          for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
            window.removeEventListener(type, kick);
          }
        };
        for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
          window.addEventListener(type, kick, { once: false, passive: true });
        }
      });
    };
    start();

    return () => {
      el.pause();
      el.src = "";
      audio.current = null;
    };
    // Built once, from whatever the stored preference was at mount. Later
    // changes go straight to the element, not through this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const changeVolume = useCallback((next: number) => {
    const el = audio.current;
    setVolume(next);
    localStorage.setItem(VOLUME_KEY, String(next));
    if (!el) return;
    el.volume = next;
    // Dragging the slider up should undo a mute, not fight it.
    if (next > 0 && el.muted) {
      el.muted = false;
      setMuted(false);
      localStorage.setItem(MUTED_KEY, "0");
    }
  }, []);

  const toggleMute = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    localStorage.setItem(MUTED_KEY, el.muted ? "1" : "0");
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="fixed right-[var(--shell-pad)] top-7 z-40 flex items-center gap-2.5"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="card flex items-center gap-3 py-1.5 pl-1.5 pr-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- Apple's CDN is
            not in the image config and this is already a sized thumbnail. */}
        <img
          src={music.artwork}
          alt=""
          width={34}
          height={34}
          className="rounded-md"
          style={{ opacity: playing ? 1 : 0.6, transition: "opacity 400ms var(--ease-out-expo)" }}
        />

        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            {/* Bars move only while sound is genuinely coming out. */}
            <span className="flex h-3 items-end gap-[2px]" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-[2px] rounded-full bg-moss"
                  style={{
                    height: playing && !muted ? 12 : 3,
                    animation:
                      playing && !muted
                        ? `equaliser 900ms ease-in-out ${i * 140}ms infinite`
                        : undefined,
                    transition: "height 300ms var(--ease-out-expo)",
                  }}
                />
              ))}
            </span>
            <span className="max-w-[150px] truncate text-[12px] leading-tight text-ink">
              {music.title}
            </span>
          </span>
          <span className="block max-w-[170px] truncate text-[10.5px] leading-tight text-muted">
            {music.artist}
          </span>
        </span>

        {/* Volume appears on hover: a slider parked permanently in the corner of
            every page is clutter for a control most people touch once. */}
        <span
          className="flex items-center overflow-hidden"
          style={{
            width: expanded ? 92 : 0,
            opacity: expanded ? 1 : 0,
            transition: "width 420ms var(--ease-out-expo), opacity 300ms var(--ease-out-expo)",
          }}
        >
          <button
            onClick={toggleMute}
            className="mr-1.5 shrink-0 text-[12px] text-muted transition-colors hover:text-ink"
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted || volume === 0 ? "🔇" : "🔊"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="h-[3px] w-full cursor-pointer accent-[#50501d]"
            aria-label="Volume"
          />
        </span>

        <a
          href={music.appleUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="shrink-0 text-[10px] text-faint transition-colors hover:text-moss"
          title="Hear the full track on Apple Music"
        >
          ↗
        </a>
      </div>

      <button
        onClick={toggle}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rule bg-surface text-[13px] text-ink shadow-[0_1px_2px_rgb(87_75_59_/_0.05),0_10px_26px_-14px_rgb(87_75_59_/_0.3)] transition-colors duration-300 hover:border-moss hover:text-moss"
        aria-label={playing ? "Pause music" : "Play music"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
    </div>
  );
}
