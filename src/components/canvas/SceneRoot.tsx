"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { HUB } from "@/data/hub";
import { useScene } from "@/lib/scene-state";

const HubScene = dynamic(() => import("./HubScene").then((m) => m.HubScene), { ssr: false });

/**
 * The 3D layer, mounted once in the root layout and never unmounted.
 *
 * Putting the canvas in a page would restart it on every navigation — a WebGL
 * context teardown, a reload of four models, and a hard cut where the whole
 * design depends on continuity. Here it simply keeps running while the pages
 * change above it.
 */
export function SceneRoot() {
  const { focused, leaving, arrivedAt, enter } = useScene();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Pointer events are enabled only on the hub, where the objects are
          controls; inside a section the object is scenery behind the text. */}
      {/* The pointer cursor is scoped to the canvas and driven declaratively.
          Writing it to document.body turned every line of text on the page
          into a pointer target the instant a mesh was hovered, which read as
          the labels lighting up along with the object. */}
      <div
        className={[
          "h-full",
          focused === null && leaving === null ? "pointer-events-auto" : "",
          hovered ? "cursor-pointer" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <HubScene
          hovered={hovered}
          onHoverChange={setHovered}
          onActivate={(item) => enter(item.id, item.href)}
          focused={focused}
          leaving={leaving}
          arrivedAt={arrivedAt}
        />
      </div>
    </div>
  );
}

export { HUB };
