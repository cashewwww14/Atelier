"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { MathUtils } from "three";
import { FOCUS_POSE, type HubObject } from "@/data/hub";
import { SETTLE_MS } from "@/lib/scene-state";
import { useFitted } from "./Fit";

interface Pose {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  /** Damping rate. Lower is slower; this is the feel of the whole journey. */
  lambda: number;
  /** Extra yaw, so travel reads as "it went somewhere" rather than a fade. */
  spin: number;
}

type Phase = "hub" | "diving" | "swept" | "centred" | "focused" | "dismissed";

/**
 * Where an object belongs right now, given what the page is doing.
 *
 * A pure function rather than a pile of reassignments inside the frame loop:
 * the four poses are the whole behaviour of this component, and having them
 * side by side is what makes the motion legible.
 */
function poseFor(
  phase: Phase,
  item: HubObject,
  compact: boolean,
  halfW: number,
  halfH: number,
  viewportHeight: number,
): Pose {
  const rest = compact ? item.compact : item;
  const focus = compact ? FOCUS_POSE.compact : FOCUS_POSE;

  switch (phase) {
    case "diving":
      // The one you picked: straight at the camera through the centre of the
      // frame, spinning as it comes. Everything else clears out around it.
      return {
        x: 0,
        y: 0,
        z: 7.6,
        scale: rest.scale * viewportHeight * 2.4,
        opacity: 1,
        lambda: 2.6,
        spin: 5.5,
      };
    case "swept":
      // Not chosen: pushed off its own side of the frame, quickly, so the
      // stage is empty by the time the chosen one fills it.
      return {
        x: (Math.sign(rest.nx) || 1) * halfW * 2.4,
        y: rest.ny * halfH * 1.4,
        z: -1,
        scale: rest.scale * viewportHeight * 0.8,
        opacity: 0,
        lambda: 5.5,
        spin: 0,
      };
    case "centred":
      // Just arrived. Still where the dive left it, holding the middle for a
      // beat before it retreats and becomes scenery.
      return {
        x: 0,
        y: 0,
        z: 4.2,
        scale: rest.scale * viewportHeight * 1.9,
        opacity: 0.9,
        lambda: 3.4,
        spin: 5.5,
      };
    case "focused":
      return {
        x: focus.nx * halfW,
        y: focus.ny * halfH,
        z: -1.2,
        scale: focus.scale * viewportHeight,
        // Scenery behind a page of text: present, never competing with it.
        opacity: 0.38,
        lambda: 1.6,
        spin: 5.5,
      };
    case "dismissed":
      // Falls back and away rather than vanishing on the spot.
      return {
        x: rest.nx * halfW * 1.5,
        y: rest.ny * halfH * 1.5,
        z: -6,
        scale: rest.scale * viewportHeight * 0.5,
        opacity: 0,
        lambda: 2.2,
        spin: 0,
      };
    default:
      return {
        x: rest.nx * halfW,
        y: rest.ny * halfH,
        z: 0,
        scale: rest.scale * viewportHeight,
        opacity: 1,
        lambda: 3.2,
        spin: 0,
      };
  }
}

interface HubItemProps {
  item: HubObject;
  compact: boolean;
  /** Staggered so the four objects never bob in unison. */
  phaseOffset: number;
  hovered: boolean;
  dimmed: boolean;
  onHoverChange: (id: string | null) => void;
  onActivate: (item: HubObject) => void;
  /** Object owning the current route, or null on the hub. */
  focused: string | null;
  /** Object mid-exit, between the click and the route change. */
  leaving: string | null;
  /** When the current route arrived; compared per frame against SETTLE_MS. */
  arrivedAt: RefObject<number>;
}

/**
 * One object in the hub — and the same object, still in motion, once you are
 * inside its section.
 *
 * Six poses, damped between rather than cut:
 *   hub       its slot in the arrangement
 *   diving    the one you picked, spinning up through the centre of the frame
 *   swept     the ones you did not, clearing the stage quickly
 *   centred   holding the middle for a beat while the new page mounts
 *   focused   retreated to the side as the page's backdrop, turning on scroll
 *   dismissed pushed back and faded, because another object took the stage
 *
 * Everything is expressed against the live viewport, so the arrangement keeps
 * its proportions from a phone to an ultrawide.
 */
export function HubItem({
  item,
  compact,
  phaseOffset,
  hovered,
  dimmed,
  onHoverChange,
  onActivate,
  focused,
  leaving,
  arrivedAt,
}: HubItemProps) {
  const gltf = useGLTF(item.model);
  const group = useRef<Group>(null);
  const [pressed, setPressed] = useState(false);
  const viewport = useThree((s) => s.viewport);

  const isLeaving = leaving === item.id;
  const isFocused = focused === item.id;
  const isDismissed = focused !== null && !isFocused;
  const interactive = focused === null && leaving === null;

  // Fitted to 1 unit on its longest axis, then scaled per frame. Normalising
  // by height alone made the workbench — twice as wide as tall — swallow
  // everything beside it while measuring as the same size.
  const { object } = useFitted(gltf.scene, {
    size: 1,
    fit: "max",
    anchor: "center",
    envMapIntensity: 1.15,
    shadows: false,
  });

  // Collected once so the per-frame fade does not re-traverse the graph. Held
  // in a ref rather than a memo because the frame loop writes to these every
  // tick, which is exactly what a ref is for and what a memo value is not.
  const materials = useRef<MeshStandardMaterial[]>([]);

  /**
   * Hover motion, held outside React.
   *
   * `hoverMix` eases 0→1 so the lift, sway and tilt blend in rather than
   * snapping. `hoverTurn` accumulates for as long as the pointer stays, which
   * is what makes the object keep turning instead of settling at one angle —
   * damping toward a fixed target can only ever rotate once. Leaving unwinds
   * it back to rest rather than stopping dead.
   */
  const hoverMix = useRef(0);
  const hoverTurn = useRef(0);

  useLayoutEffect(() => {
    const found: MeshStandardMaterial[] = [];
    object.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as MeshStandardMaterial;
      if (material) {
        material.transparent = true;
        found.push(material);
      }
    });
    materials.current = found;
  }, [object]);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const t = clock.elapsedTime;

    const settling = performance.now() - arrivedAt.current < SETTLE_MS;
    const someoneLeaving = leaving !== null;
    const phase: Phase = isLeaving
      ? "diving"
      : someoneLeaving
        ? "swept"
        : isFocused
          ? settling
            ? "centred"
            : "focused"
          : isDismissed
            ? "dismissed"
            : "hub";

    const pose = poseFor(phase, item, compact, viewport.width / 2, viewport.height / 2, viewport.height);

    // On the hub the object breathes and answers the pointer; in every other
    // phase it is travelling and those idle motions would fight the journey.
    const idle = phase === "hub";
    const wants = hovered && idle;

    hoverMix.current = MathUtils.damp(hoverMix.current, wants ? 1 : 0, 6, dt);
    if (wants) {
      hoverTurn.current += dt * 0.85;
    } else {
      // Settle to the *nearest whole turn*, not to zero. A cursor left resting
      // for a minute accumulates fifty-odd radians, and unwinding all of it
      // would send the object spinning backwards; the nearest multiple of 2π
      // is the same orientation and is never more than half a turn away.
      const nearestTurn = Math.round(hoverTurn.current / (Math.PI * 2)) * Math.PI * 2;
      hoverTurn.current = MathUtils.damp(hoverTurn.current, nearestTurn, 2.4, dt);
    }

    const mix = hoverMix.current;
    // Faster and shallower than the resting breath — the difference in rhythm
    // is what reads as "lifted off" rather than just "moved up".
    const hoverBob = Math.sin(t * 2.15 + phaseOffset) * 0.055 * mix;
    const hoverSway = Math.sin(t * 1.35 + phaseOffset * 2) * 0.1 * mix;

    const y =
      pose.y +
      (idle
        ? Math.sin(t * 0.55 + phaseOffset) * 0.075 + 0.34 * mix + hoverBob + (pressed ? -0.12 : 0)
        : 0);
    const scale =
      pose.scale * (idle ? 1 + 0.13 * mix : 1) * (pressed ? 0.96 : 1) * (dimmed && idle ? 0.97 : 1);

    g.position.x = MathUtils.damp(g.position.x, pose.x + (idle ? hoverSway : 0), pose.lambda, dt);
    g.position.y = MathUtils.damp(g.position.y, y, pose.lambda, dt);
    g.position.z = MathUtils.damp(g.position.z, pose.z, pose.lambda, dt);
    g.scale.setScalar(MathUtils.damp(g.scale.x || scale, scale, pose.lambda + 1, dt));

    g.rotation.y = MathUtils.damp(
      g.rotation.y,
      item.tilt[1] * (1 - mix * 0.55) +
        pose.spin +
        hoverTurn.current +
        (idle ? Math.sin(t * 0.22 + phaseOffset) * 0.06 : 0) +
        // Parked scenery turns with the page: a full revolution per 2400px,
        // slow enough to read as the object being circled rather than spun.
        (phase === "focused" ? (window.scrollY / 2400) * Math.PI * 2 : 0),
      pose.lambda * 0.8,
      dt,
    );
    g.rotation.z = MathUtils.damp(
      g.rotation.z,
      item.tilt[2] +
        (idle ? Math.sin(t * 0.36 + phaseOffset * 1.7) * 0.045 : 0) +
        // A slow roll while held, so the turn is not a flat carousel.
        Math.sin(t * 1.1 + phaseOffset) * 0.07 * mix,
      pose.lambda,
      dt,
    );
    g.rotation.x = MathUtils.damp(
      g.rotation.x,
      // Pitches up a touch to present itself, rather than turning side-on.
      item.tilt[0] * (1 - mix * 0.6) - 0.1 * mix,
      pose.lambda,
      dt,
    );

    for (const material of materials.current) {
      // Animating a material every frame is what the render loop is for. The
      // compiler treats anything reachable from a memoised object as immutable,
      // which does not model three's objects.
      // eslint-disable-next-line react-hooks/immutability
      material.opacity = MathUtils.damp(material.opacity, pose.opacity, pose.lambda, dt);
      // Fully faded geometry should stop writing depth, or it punches holes in
      // whatever is behind it.
      material.depthWrite = material.opacity > 0.92;
    }
    const faded = materials.current[0];
    g.visible = !faded || faded.opacity > 0.01;
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onHoverChange(item.id);
      }}
      onPointerOut={() => {
        onHoverChange(null);
        setPressed(false);
      }}
      onPointerDown={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        setPressed(true);
      }}
      onPointerUp={() => setPressed(false)}
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onActivate(item);
      }}
    >
      <primitive object={object} />
    </group>
  );
}
