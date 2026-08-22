"use client";

import { useEffect, useRef, useState } from "react";
import { INK, Panel, Slider } from "./shared";
import { createRenderer, type Params } from "./floor-socket/gl";

const ACCENT = "#4A5490";

const INITIAL: Params = {
  lightX: 1.4,
  lightY: 2.1,
  lightZ: 2.6,
  ambient: 0.24,
  diffuse: 0.78,
  specular: 0.62,
  shininess: 44,
  texture: "checker",
  textureLit: true,
};

export function FloorSocketMockup() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createRenderer>>(null);
  const [params, setParams] = useState<Params>(INITIAL);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    const r = createRenderer(canvas.current);
    if (!r) {
      setFailed(true);
      return;
    }
    renderer.current = r;
    r.start(INITIAL);
    return () => r.dispose();
  }, []);

  useEffect(() => {
    renderer.current?.update(params);
  }, [params]);

  const set = <K extends keyof Params>(k: K, v: Params[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex h-full w-full" style={{ background: INK.bg, color: INK.ink }}>
      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${INK.line}` }}
        >
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-semibold tracking-tight">Floor Socket 3D</h1>
            <span className="text-[11.5px]" style={{ color: INK.muted }}>
              Raw WebGL · no Three.js
            </span>
          </div>
          <div className="flex gap-1.5">
            {(["checker", "flat"] as const).map((m) => (
              <button
                key={m}
                onClick={() => set("texture", m)}
                className="rounded-md px-2.5 py-1 text-[11.5px] transition-colors"
                style={{
                  background: params.texture === m ? "#e8eaf4" : INK.panel,
                  color: params.texture === m ? ACCENT : INK.muted,
                }}
              >
                {m === "checker" ? "Checkerboard" : "Flat"}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 p-5">
          <div
            className="relative h-full overflow-hidden rounded-lg"
            style={{ background: "#eef0f6", border: `1px solid ${INK.line}` }}
          >
            <canvas ref={canvas} className="h-full w-full" />

            {failed && (
              <p className="absolute inset-0 grid place-items-center text-[13px]" style={{ color: INK.muted }}>
                WebGL is unavailable in this browser.
              </p>
            )}

            <div className="pointer-events-none absolute left-4 top-3 font-mono text-[10.5px]" style={{ color: INK.muted }}>
              <p>gl.TRIANGLES · 108 verts</p>
              <p>WebGL 1.0 · hand-written shaders</p>
            </div>
          </div>
        </div>
      </main>

      <aside
        className="flex w-[288px] shrink-0 flex-col gap-4 overflow-y-auto px-5 py-5"
        style={{ background: INK.panel, borderLeft: `1px solid ${INK.line}` }}
      >
        <Panel className="px-4 py-4">
          <p className="text-[12.5px] font-medium">Lighting</p>
          <p className="mt-0.5 text-[11px]" style={{ color: INK.muted }}>
            Phong model, in the fragment shader
          </p>

          <div className="mt-4 space-y-3.5">
            <Slider label="Light X" value={params.lightX} min={-4} max={4} step={0.05} accent={ACCENT} readout={params.lightX.toFixed(2)} onChange={(v) => set("lightX", v)} />
            <Slider label="Light Y" value={params.lightY} min={-4} max={4} step={0.05} accent={ACCENT} readout={params.lightY.toFixed(2)} onChange={(v) => set("lightY", v)} />
            <Slider label="Light Z" value={params.lightZ} min={-4} max={4} step={0.05} accent={ACCENT} readout={params.lightZ.toFixed(2)} onChange={(v) => set("lightZ", v)} />
            <Slider label="Ambient" value={params.ambient} accent={ACCENT} readout={params.ambient.toFixed(2)} onChange={(v) => set("ambient", v)} />
            <Slider label="Diffuse" value={params.diffuse} accent={ACCENT} readout={params.diffuse.toFixed(2)} onChange={(v) => set("diffuse", v)} />
            <Slider label="Specular" value={params.specular} accent={ACCENT} readout={params.specular.toFixed(2)} onChange={(v) => set("specular", v)} />
            <Slider label="Shininess" value={params.shininess} min={1} max={128} step={1} accent={ACCENT} readout={params.shininess.toFixed(0)} onChange={(v) => set("shininess", v)} />
          </div>

          <div
            className="mt-4 flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: INK.panel }}
          >
            <span className="text-[11.5px]" style={{ color: INK.secondary }}>
              Texture responds to light
            </span>
            <button
              onClick={() => set("textureLit", !params.textureLit)}
              className="relative h-[18px] w-[32px] rounded-full transition-colors"
              style={{ background: params.textureLit ? ACCENT : "#ded8ca" }}
              aria-pressed={params.textureLit}
            >
              <span
                className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all"
                style={{ left: params.textureLit ? 16 : 2 }}
              />
            </button>
          </div>

          <button
            onClick={() => setParams(INITIAL)}
            className="mt-3 w-full rounded-lg py-2 text-[12px] font-medium transition-colors"
            style={{ background: "#e8eaf4", color: ACCENT }}
          >
            Reset
          </button>
        </Panel>

        <Panel className="px-4 py-3.5">
          <p className="text-[12.5px] font-medium">fragment.glsl</p>
          <pre className="mt-2.5 overflow-x-auto font-mono text-[9.5px] leading-[1.7]" style={{ color: INK.muted }}>
{`vec3 N = normalize(vNormal);
vec3 L = normalize(uLightPos - vPos);
vec3 V = normalize(uEye - vPos);
vec3 R = reflect(-L, N);

float diff = max(dot(N, L), 0.0);
float spec = pow(max(dot(R,V), 0.0),
                 uShininess);

vec3 lit = tex * (uAmbient
         + uDiffuse * diff)
         + uSpecular * spec;`}
          </pre>
        </Panel>
      </aside>
    </div>
  );
}
