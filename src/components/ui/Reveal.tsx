"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
  type ElementType,
  type ReactNode,
  type Ref,
} from "react";

/**
 * The polymorphic `as` prop collapses to `never` if the tag stays a bare
 * ElementType union, so it is narrowed to the handful of props this component
 * actually forwards.
 */
type Polymorphic = ComponentType<{
  ref?: Ref<HTMLElement>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}>;

interface RevealProps {
  children: ReactNode;
  /** Seconds of delay, for hand-tuned stagger within a group. */
  delay?: number;
  /** Travel distance in px. Negative values come from above. */
  y?: number;
  x?: number;
  as?: ElementType;
  className?: string;
  /** Fires once and then stops observing. */
  once?: boolean;
}

/**
 * Enter animation driven by IntersectionObserver and plain CSS transitions.
 *
 * Deliberately not a timeline library: these are one-shot, non-interruptible
 * reveals, and compositor-only transform/opacity transitions stay smooth
 * during heavy WebGL frames in a way JS-ticked tweens do not.
 */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  x = 0,
  as: Tag = "div",
  className = "",
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      // Trigger a little before the element is fully on screen, so content is
      // already settled by the time the reader's eye arrives.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  const Component = Tag as Polymorphic;

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(${x}px, ${y}px, 0)`,
        transition: `opacity 900ms var(--ease-out-expo) ${delay}s, transform 1100ms var(--ease-out-expo) ${delay}s`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Component>
  );
}
