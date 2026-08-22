"use client";

import { useMemo, useState } from "react";
import { INK, Panel } from "./shared";
import { makeRandom } from "@/lib/random";

const ACCENT = "#4A6B3F";
const ACCENT_B = "#A8643C";

/**
 * Network KPI, following the real dashboards in `cashewwww14/Project-KPI`.
 *
 * That repo ships two pages — `dashboard_4g.html` and `dashboard.html` (5G) —
 * each a Chart.js board behind a single "Select Network Cluster (NC)" filter,
 * fed by a Flask API over PostgreSQL. So this is a monitoring board and nothing
 * else: a technology switch, the cluster filter, a refresh, and the same panels
 * the originals draw. There is no deck button, because the PowerPoint builder
 * is a separate scheduled script rather than something the site does.
 *
 * Every series here is generated from a seed. No operator metrics appear — the
 * ranges are only plausible enough that the charts read as charts.
 */

type Tech = "4G" | "5G";

interface PanelSpec {
  /** Verbatim from the original dashboards, including the two-series titles. */
  title: string;
  unit: string;
  kind: "line" | "bar";
  /** Plausible band for the invented series. */
  range: [number, number];
  /** Second axis, for the panels the originals plot as "A vs B". */
  second?: [number, number];
  /** Series names, where the title alone does not name both. */
  legend?: [string, string];
  decimals?: number;
}

const PANELS: Record<Tech, PanelSpec[]> = {
  "4G": [
    { title: "📈 Availability (%)", unit: "%", kind: "line", range: [97.4, 99.96], decimals: 2 },
    { title: "🎯 Accessibility (S1 Failure)", unit: "%", kind: "line", range: [0.08, 1.15], decimals: 2 },
    { title: "👥 RRC Conn User", unit: "users", kind: "bar", range: [12400, 47800], decimals: 0 },
    { title: "💾 Traffic 4G (GB)", unit: "GB", kind: "bar", range: [8200, 26400], decimals: 0 },
    { title: "📊 EUT vs #Cells_EUT", unit: "Mbps", kind: "line", range: [4.2, 17.8], second: [24, 138], decimals: 1 },
    { title: "📡 DL PRB Utilization vs DL PRB Util > 90%", unit: "%", kind: "line", range: [34, 71], second: [4, 38], decimals: 1 },
    { title: "📶 CQI vs #Cells_CQI", unit: "idx", kind: "line", range: [8.2, 12.6], second: [30, 176], decimals: 2 },
    { title: "👤 User IOH vs IM3", unit: "users", kind: "bar", range: [9100, 29600], second: [4200, 15800], decimals: 0 },
    { title: "🔄 Traffic 4G-5G", unit: "GB", kind: "bar", range: [10500, 32200], second: [1800, 12600], decimals: 0, legend: ["Traffic 4G", "Traffic 5G"] },
    { title: "📊 Traffic 4G vs 5G (%)", unit: "%", kind: "line", range: [56, 86], second: [14, 44], decimals: 1, legend: ["4G share", "5G share"] },
  ],
  "5G": [
    { title: "📈 Availability (%)", unit: "%", kind: "line", range: [98.1, 99.99], decimals: 2 },
    { title: "🎯 Accessibility", unit: "%", kind: "line", range: [97.4, 99.85], decimals: 2 },
    { title: "📞 Call Drop Rate", unit: "%", kind: "line", range: [0.02, 0.58], decimals: 2 },
    { title: "🔗 SGNB Addition SR (%)", unit: "%", kind: "line", range: [92.4, 99.4], decimals: 2 },
    { title: "💾 Traffic 5G (GB)", unit: "GB", kind: "bar", range: [2100, 14300], decimals: 0 },
    { title: "📊 EUT vs DL User Thp", unit: "Mbps", kind: "line", range: [46, 182], second: [88, 265], decimals: 1, legend: ["EUT", "DL User Thp"] },
    { title: "👥 User 5G", unit: "users", kind: "bar", range: [1500, 12200], decimals: 0 },
    { title: "📡 DL PRB Utilization vs DL PRB Util > 85%", unit: "%", kind: "line", range: [17, 54], second: [1, 22], decimals: 1 },
    { title: "🔄 Inter-eSgNB PSCell Change (%)", unit: "%", kind: "line", range: [88.2, 99.1], decimals: 2 },
    { title: "🔄 Intra-eSgNB PSCell Change (%)", unit: "%", kind: "line", range: [90.4, 99.5], decimals: 2 },
    { title: "🔄 Intra-SgNB Intrafreq PSCell Change (%)", unit: "%", kind: "line", range: [91.1, 99.6], decimals: 2 },
    { title: "🔄 Inter-SgNB Intrafreq PSCell Change (%)", unit: "%", kind: "line", range: [89.3, 99.2], decimals: 2 },
  ],
};

/** Invented cluster names. */
const CLUSTERS = ["All", "NC_SBY_INNER", "NC_SBY_OUTER", "NC_SDA_NORTH", "NC_GRESIK", "NC_MALANG_CITY"];

const DAYS = 14;

/** Deterministic, so a cluster always draws the same shape. */
function series(seed: string, [lo, hi]: [number, number], points = DAYS) {
  const rand = makeRandom([...seed].reduce((a, c) => a + c.charCodeAt(0) * 31, 7));
  const span = hi - lo;
  let value = lo + span * (0.3 + rand() * 0.4);
  return Array.from({ length: points }, () => {
    value += (rand() - 0.5) * span * 0.28;
    value = Math.max(lo, Math.min(hi, value));
    return value;
  });
}

/** "📊 EUT vs #Cells_EUT" → ["EUT", "#Cells_EUT"], unless the panel names its own. */
function legendOf(p: PanelSpec) {
  if (p.legend) return p.legend;
  const [a, b] = p.title.replace(/^\S+\s/, "").split(" vs ");
  return [a, b ?? "secondary"];
}

function format(v: number, decimals: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function Chart({ a, b, kind }: { a: number[]; b?: number[]; kind: "line" | "bar" }) {
  const w = 268;
  const h = 66;
  const pad = 4;

  /** Each series on its own axis, as the originals do with two y scales. */
  const project = (data: number[], floor: number) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const lo = min - (max - min || 1) * floor;
    const span = max - lo || 1;
    return {
      x: (i: number) => (i / (data.length - 1)) * (w - pad * 2) + pad,
      y: (v: number) => h - pad - ((v - lo) / span) * (h - pad * 2),
    };
  };

  const path = (data: number[], floor: number) => {
    const { x, y } = project(data, floor);
    return data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  };

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} height={h} aria-hidden>
      {kind === "bar"
        ? (() => {
            const { x, y } = project(a, 0.55);
            const slots = (w - pad * 2) / a.length;
            const bw = b ? slots / 2 - 1.5 : slots - 2;
            const pb = b ? project(b, 0.55) : null;
            return a.map((v, i) => (
              <g key={i}>
                <rect
                  x={x(i) - (b ? slots / 2 - 1 : bw / 2)}
                  y={y(v)}
                  width={Math.max(2, bw)}
                  height={Math.max(1, h - pad - y(v))}
                  rx="1.5"
                  fill={ACCENT}
                  opacity={i === a.length - 1 ? 1 : 0.6}
                />
                {pb && b && (
                  <rect
                    x={x(i) + 0.5}
                    y={pb.y(b[i])}
                    width={Math.max(2, bw)}
                    height={Math.max(1, h - pad - pb.y(b[i]))}
                    rx="1.5"
                    fill={ACCENT_B}
                    opacity={i === a.length - 1 ? 0.9 : 0.5}
                  />
                )}
              </g>
            ));
          })()
        : (
            <>
              <path d={`${path(a, 0.25)} L${w - pad},${h} L${pad},${h} Z`} fill={ACCENT} opacity="0.1" />
              {b && (
                <path
                  d={path(b, 0.25)}
                  fill="none"
                  stroke={ACCENT_B}
                  strokeWidth="1.5"
                  strokeDasharray="3 2.5"
                  strokeLinejoin="round"
                />
              )}
              <path d={path(a, 0.25)} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
    </svg>
  );
}

export function KpiMockup() {
  const [tech, setTech] = useState<Tech>("4G");
  const [cluster, setCluster] = useState("All");
  const [stamp, setStamp] = useState("14 Aug 2026, 08:05");
  const [busy, setBusy] = useState(false);

  const panels = PANELS[tech];
  const data = useMemo(
    () =>
      panels.map((p) => ({
        a: series(`${tech}|${cluster}|${p.title}|${stamp}`, p.range),
        b: p.second ? series(`${tech}|${cluster}|${p.title}|b|${stamp}`, p.second) : undefined,
      })),
    [panels, tech, cluster, stamp],
  );

  const refresh = () => {
    setBusy(true);
    setTimeout(() => {
      const now = new Date();
      setStamp(
        `14 Aug 2026, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      );
      setBusy(false);
    }, 700);
  };

  return (
    <div className="flex h-full w-full flex-col" style={{ background: INK.bg, color: INK.ink }}>
      <header className="shrink-0 px-8 pb-4 pt-5" style={{ borderBottom: `1px solid ${INK.line}` }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight">
              {tech === "4G" ? "📱" : "📊"} {tech} KPI Dashboard
            </h1>
            <p className="mt-0.5 text-[12.5px]" style={{ color: INK.muted }}>
              Cluster {cluster} · last update {stamp}
            </p>
          </div>

          {/* The two pages of the original, as one switch. */}
          <div className="flex rounded-lg p-0.5" style={{ background: INK.panel }}>
            {(["4G", "5G"] as Tech[]).map((t) => (
              <button
                key={t}
                onClick={() => setTech(t)}
                className="rounded-md px-4 py-1.5 text-[12.5px] font-medium transition-colors"
                style={{
                  background: tech === t ? ACCENT : "transparent",
                  color: tech === t ? "#fff" : INK.muted,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12.5px]" style={{ color: INK.secondary }}>
            🔍 Select Network Cluster (NC):
            <select
              value={cluster}
              onChange={(e) => setCluster(e.target.value)}
              className="h-[32px] rounded-lg px-2.5 text-[12.5px]"
              style={{ background: "#fff", border: `1px solid ${INK.line}`, color: INK.ink }}
            >
              {CLUSTERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={refresh}
            disabled={busy}
            className="h-[32px] rounded-lg px-3.5 text-[12.5px] font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: ACCENT }}
          >
            {busy ? "Loading…" : "🔄 Refresh Data"}
          </button>

          <span className="ml-auto text-[11.5px]" style={{ color: INK.faint }}>
            {panels.length} panels · last {DAYS} days
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-4">
          {panels.map((p, i) => {
            const { a, b } = data[i];
            const decimals = p.decimals ?? 2;
            const latest = a[a.length - 1];
            const delta = latest - (a[a.length - 2] ?? latest);
            const [nameA, nameB] = legendOf(p);
            return (
              <Panel key={p.title} className="px-4 py-3.5">
                <h3 className="min-h-[2.6em] text-[12px] font-semibold leading-snug">{p.title}</h3>
                <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-mono text-[19px] font-semibold tabular-nums">
                    {format(latest, decimals)}
                  </span>
                  <span className="text-[11px]" style={{ color: INK.muted }}>
                    {p.unit}
                  </span>
                  {/* A flat day should read as flat, not as "up by zero". */}
                  {Math.abs(delta) < 0.5 / 10 ** decimals ? (
                    <span className="font-mono text-[11px]" style={{ color: INK.faint }}>
                      — flat
                    </span>
                  ) : (
                    <span
                      className="font-mono text-[11px] tabular-nums"
                      style={{ color: delta > 0 ? "#3d6b32" : "#8a473c" }}
                    >
                      {delta > 0 ? "▲" : "▼"} {format(Math.abs(delta), decimals)}
                    </span>
                  )}
                </p>

                {b && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]" style={{ color: INK.muted }}>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-[2px] w-3 rounded-full" style={{ background: ACCENT }} />
                      {nameA}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-[2px] w-3 rounded-full" style={{ background: ACCENT_B }} />
                      {nameB} · {format(b[b.length - 1], 0)}
                    </span>
                  </p>
                )}

                <div className="mt-1.5" style={{ opacity: busy ? 0.35 : 1, transition: "opacity 300ms" }}>
                  <Chart a={a} b={b} kind={p.kind} />
                </div>
              </Panel>
            );
          })}
        </div>

        <p className="mt-5 text-center text-[11px]" style={{ color: INK.faint }}>
          Flask API over PostgreSQL, drawn with Chart.js. The PowerPoint recap runs
          as a scheduled script, separately from this board.
        </p>
      </div>
    </div>
  );
}
