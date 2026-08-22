"use client";

import { useMemo } from "react";
import { Box3, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";

interface FitOptions {
  /** Target size in world units along whichever axis `fit` selects. */
  size: number;
  /**
   * `height` scales by the Y extent; `max` scales by the largest extent.
   *
   * `max` is what a poster layout wants: the workbench is twice as wide as it
   * is tall, so normalising it by height alone makes it dwarf everything
   * beside it while measuring as the same "size".
   */
  fit?: "height" | "max";
  /** `base` sits it on y = 0; `center` centres it on the origin. */
  anchor?: "base" | "center";
  envMapIntensity?: number;
  shadows?: boolean;
}

export interface Fitted {
  object: Object3D;
  /** Post-scale extents, so callers can place labels off the real silhouette. */
  extent: Vector3;
}

/**
 * The source models come out of an AI generator at arbitrary scale — anywhere
 * from 0.5 to 1.1 units for objects metres apart in reality. This normalises
 * one, centres it on its own footprint so placement coordinates mean what they
 * say, and reports what it ended up measuring.
 */
export function useFitted(source: Object3D, opts: FitOptions): Fitted {
  const { size, fit = "height", anchor = "base", envMapIntensity = 1, shadows = true } = opts;

  return useMemo(() => {
    const object = source.clone(true);

    const box = new Box3().setFromObject(object);
    const extent = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    const basis = fit === "max" ? Math.max(extent.x, extent.y, extent.z) : extent.y;
    const scale = basis > 0 ? size / basis : 1;

    object.scale.setScalar(scale);
    object.position.set(
      -center.x * scale,
      anchor === "base" ? -box.min.y * scale : -center.y * scale,
      -center.z * scale,
    );

    object.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;

      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      // Photogrammetry-style scans arrive double-sided, which doubles shadow
      // cost and produces acne on thin geometry. Single-sided is correct here.
      const material = mesh.material as MeshStandardMaterial;
      if (material) {
        material.side = 0; // FrontSide
        material.envMapIntensity = envMapIntensity;
        material.dithering = true;
      }
    });

    return { object, extent: extent.multiplyScalar(scale) };
  }, [source, size, fit, anchor, envMapIntensity, shadows]);
}

export function FittedModel({ source, ...opts }: FitOptions & { source: Object3D }) {
  const { object } = useFitted(source, opts);
  return <primitive object={object} />;
}
