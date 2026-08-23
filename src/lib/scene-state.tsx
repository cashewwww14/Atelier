"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { objectForPath } from "@/data/hub";

/**
 * Shared state between the persistent 3D scene and the pages drawn over it.
 *
 * The canvas lives in the root layout so navigation never unmounts it. That is
 * what lets one object leave the hub, be gone while the next page loads, and
 * then swing back in as that page's backdrop — one continuous object rather
 * than two separate animations that happen to look alike.
 *
 * The journey has three beats, and the scene needs to be told about each:
 *
 *   leaving   the object flies off the side of the frame and fades out
 *   settling  it is off-stage; the new page is mounting
 *   focused   it swings back in, parks, and becomes scenery
 */

interface SceneState {
  /** Object owning the current route, or null on the hub. */
  focused: string | null;
  /** Object mid-exit, between the click and the route change. */
  leaving: string | null;
  /**
   * When the current route arrived, as a `performance.now()` stamp.
   *
   * A ref rather than state on purpose: the only consumer is the render loop,
   * which reads it every frame anyway. Flipping a boolean on a timer would
   * re-render the whole tree twice per navigation to tell it something it
   * could work out itself.
   */
  arrivedAt: RefObject<number>;
  /** Fly an object off the frame, then navigate. */
  enter: (id: string, href: string) => void;
  /** Warm a route while the pointer is on its object, before any click. */
  prefetch: (href: string) => void;
  /** True on the hub, where the labels and name belong. */
  onHub: boolean;
  /**
   * False until the visitor clicks through the opening curtain.
   *
   * Two things hang off this. The objects hold back — further away, dimmer,
   * turning slowly — so the curtain has something alive behind it instead of a
   * flat colour, and they settle into the arrangement only once someone has
   * arrived. And the click itself is the user gesture browsers demand before
   * any audio may play with sound, which is why the curtain is a door rather
   * than a timer.
   */
  entered: boolean;
  /** Open the door. Idempotent; the first call is the one that counts. */
  enterSite: () => void;
}

/** Fired on `window` when the curtain is opened, so the player can start. */
export const ENTER_EVENT = "atelier:enter";

/** Beat of stillness after arrival, before the object starts to retreat. */
export const SETTLE_MS = 380;

/** How long the retreat from the middle of the frame to the parked pose takes. */
export const GLIDE_MS = 1250;

const Context = createContext<SceneState | null>(null);

/** Long enough for the object to clear the frame before the URL changes. */
const EXIT_MS = 950;

export function SceneProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  const exitTimer = useRef<number | null>(null);
  const arrivedAt = useRef(0);
  // Anyone landing straight on a section never sees the curtain, so there is
  // nothing to open — treat them as already inside.
  const [entered, setEntered] = useState(() => pathname !== "/");

  const enterSite = useCallback(() => {
    setEntered((already) => {
      if (!already) window.dispatchEvent(new Event(ENTER_EVENT));
      return true;
    });
  }, []);

  const enter = useCallback(
    (id: string, href: string) => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
      setLeaving(id);
      // Navigate only once the object has visibly left, so the page does not
      // cut in over a still frame.
      exitTimer.current = window.setTimeout(() => router.push(href), EXIT_MS);
    },
    [router],
  );

  // On arrival, stamp the clock. The scene compares against it each frame to
  // decide how far along the retreat is. Writing a ref is not a render, which
  // is the whole point of doing it this way.
  //
  // `leaving` is cleared *here*, not on the exit timer, and the difference is
  // the whole transition. `router.push` resolves asynchronously: clearing on
  // the timer opened a window where nothing was leaving and the pathname had
  // not changed yet, so every object fell back to its hub pose and the one
  // just clicked flew home again before its section appeared. The gap is
  // invisible against a warm dev server and plainly visible over a network.
  useEffect(() => {
    arrivedAt.current = performance.now();
    // The router is the external system this effect synchronises against, and
    // a route landing is an event from it — exactly the case the rule cannot
    // see. It costs one render per navigation, at the only moment the answer
    // can be known.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeaving(null);
  }, [pathname]);

  // Hovering an object is a good bet that it is about to be clicked, and a
  // route already in the cache changes hands in a frame or two.
  const prefetch = useCallback((href: string) => router.prefetch(href), [router]);

  const value = useMemo<SceneState>(
    () => ({
      focused: objectForPath(pathname),
      leaving,
      arrivedAt,
      enter,
      prefetch,
      onHub: pathname === "/",
      entered,
      enterSite,
    }),
    [pathname, leaving, enter, prefetch, entered, enterSite],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useScene() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useScene must be used inside SceneProvider");
  return ctx;
}
