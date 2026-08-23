"use client";

import { Suspense, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Preload, useGLTF } from "@react-three/drei";
import { ACESFilmicToneMapping, MathUtils, type Group } from "three";
import { HUB, type HubObject } from "@/data/hub";
import { useIsCompact, useReducedMotion } from "@/lib/env";
import { HubItem } from "./HubItem";

/**
 * Studio light for a cream page.
 *
 * A light background needs the opposite rig from a dusk scene: high ambient so
 * nothing crushes to black against the paper, a soft key from upper left for
 * form, and a cool fill opposite it so the shadow side stays a colour rather
 * than a grey hole.
 */
function StudioLight() {
  return (
    <>
      <ambientLight intensity={1.35} color="#fff8ec" />
      <directionalLight position={[-4, 6, 6]} intensity={2.1} color="#fff4e2" />
      <directionalLight position={[6, 2, 4]} intensity={0.75} color="#dbe6f0" />
      <directionalLight position={[0, -3, -5]} intensity={0.5} color="#f2ece4" />

      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#ffffff" scale={[14, 10, 1]} position={[-5, 6, 7]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#e6eef5" scale={[14, 10, 1]} position={[7, 2, 5]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#f6efe2" scale={[18, 18, 1]} rotation-x={Math.PI / 2} position={[0, -8, 0]} />
      </Environment>
    </>
  );
}

/** Whole-field parallax: the arrangement leans a little toward the cursor. */
function Parallax({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const group = useRef<Group>(null);
  const pointer = useThree((s) => s.pointer);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const target = enabled ? 1 : 0;
    g.rotation.y = MathUtils.damp(g.rotation.y, pointer.x * 0.05 * target, 4, dt);
    g.rotation.x = MathUtils.damp(g.rotation.x, -pointer.y * 0.04 * target, 4, dt);
    g.position.x = MathUtils.damp(g.position.x, pointer.x * 0.2 * target, 4, dt);
    g.position.y = MathUtils.damp(g.position.y, pointer.y * 0.14 * target, 4, dt);
  });

  return <group ref={group}>{children}</group>;
}

interface HubSceneProps {
  hovered: string | null;
  onHoverChange: (id: string | null) => void;
  onActivate: (item: HubObject) => void;
  focused: string | null;
  leaving: string | null;
  entered: boolean;
  arrivedAt: RefObject<number>;
}

export function HubScene({
  hovered,
  onHoverChange,
  onActivate,
  focused,
  leaving,
  entered,
  arrivedAt,
}: HubSceneProps) {
  const compact = useIsCompact();
  const reduced = useReducedMotion();

  return (
    <Canvas
      dpr={[1, 2]}
      // A fixed camera: every position and size in the scene is expressed
      // against the resulting viewport, so the camera itself never moves.
      camera={{ fov: 40, near: 0.1, far: 60, position: [0, 0, 12] }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        alpha: true,
      }}
      // Transparent over the page's cream, so 3D and CSS share exactly one
      // background colour and can never drift apart.
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <StudioLight />

        <Parallax enabled={!reduced && !compact && focused === null}>
          {HUB.map((item, i) => (
            <HubItem
              key={item.id}
              item={item}
              compact={compact}
              phaseOffset={i * 1.7}
              hovered={hovered === item.id}
              dimmed={hovered !== null && hovered !== item.id}
              onHoverChange={onHoverChange}
              onActivate={onActivate}
              focused={focused}
              leaving={leaving}
              entered={entered}
              arrivedAt={arrivedAt}
            />
          ))}
        </Parallax>

        <Preload all />
      </Suspense>
    </Canvas>
  );
}

HUB.forEach((item) => useGLTF.preload(item.model));
