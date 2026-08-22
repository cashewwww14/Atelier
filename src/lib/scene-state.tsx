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
  /** True on the hub, where the labels and name belong. */
  onHub: boolean;
}

/** Beat of stillness after arrival, before the object swings back in. */
export const SETTLE_MS = 520;

const Context = createContext<SceneState | null>(null);

/** Long enough for the object to clear the frame before the URL changes. */
const EXIT_MS = 950;

export function SceneProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  const exitTimer = useRef<number | null>(null);
  const arrivedAt = useRef(0);

  const enter = useCallback(
    (id: string, href: string) => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
      setLeaving(id);
      // Navigate only once the object has visibly left, so the page does not
      // cut in over a still frame.
      exitTimer.current = window.setTimeout(() => {
        router.push(href);
        // Cleared here rather than in a pathname effect: this handler is what
        // set it, so this is where it belongs, and it keeps navigation from
        // costing an extra render pass.
        setLeaving(null);
      }, EXIT_MS);
    },
    [router],
  );

  // On arrival, stamp the clock. The scene compares against it each frame to
  // decide whether the object is still waiting off-stage. Writing a ref is not
  // a render, which is the whole point of doing it this way.
  useEffect(() => {
    arrivedAt.current = performance.now();
  }, [pathname]);

  const value = useMemo<SceneState>(
    () => ({
      focused: objectForPath(pathname),
      leaving,
      arrivedAt,
      enter,
      onHub: pathname === "/",
    }),
    [pathname, leaving, enter],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useScene() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useScene must be used inside SceneProvider");
  return ctx;
}
