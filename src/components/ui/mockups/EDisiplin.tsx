"use client";

import { useMemo, useState } from "react";

/**
 * e-Disiplin, rebuilt to match the real application.
 *
 * Structure, palette and layout follow the actual frontend in
 * `cashewwww14/e-disiplin`: the navy rail that widens on hover, the blue
 * gradient header, the ten-column dashboard, and the Rekap table with its dark
 * header row. The charts are hand-drawn SVG rather than Recharts — this only
 * has to look like the app, not carry its dependencies.
 *
 * Every value inside is invented. No employee names, staff numbers, units or
 * case records from the real system appear here, and the client's logo is
 * replaced with a plain wordmark.
 */

const NAVY = "#1a2332";
const DEEP = "#0f2b5b";
const BLUE = "#2563eb";

const RINGAN = "#06b6d4";
const SEDANG = "#f59e0b";
const BERAT = "#ef4444";
const DONE = "#10b981";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "new", label: "New Case", icon: "＋" },
  { id: "rekap", label: "Rekap", icon: "▤" },
  { id: "sigap", label: "SIGAP Masuk", icon: "✉" },
  { id: "log", label: "Log Aktivitas", icon: "◷" },
  { id: "akses", label: "Manajemen Akses", icon: "👥" },
] as const;

/** Fabricated months. */
const MONTHLY = [
  { month: "Jan", ringan: 6, sedang: 4, berat: 2 },
  { month: "Feb", ringan: 8, sedang: 5, berat: 1 },
  { month: "Mar", ringan: 5, sedang: 6, berat: 3 },
  { month: "Apr", ringan: 9, sedang: 3, berat: 2 },
  { month: "Mei", ringan: 7, sedang: 7, berat: 4 },
  { month: "Jun", ringan: 11, sedang: 5, berat: 2 },
  { month: "Jul", ringan: 6, sedang: 8, berat: 3 },
  { month: "Agu", ringan: 10, sedang: 6, berat: 1 },
];

/** Invented people and units — nothing here comes from the real system. */
const VIOLATORS = [
  { name: "Rahmi Andayani", np: "NP-40821", count: 4 },
  { name: "Teguh Wicaksana", np: "NP-31577", count: 3 },
  { name: "Anwar Setiadi", np: "NP-29140", count: 3 },
  { name: "Nurul Fadhilah", np: "NP-51004", count: 2 },
  { name: "Guntur Prabowo", np: "NP-18336", count: 2 },
];

const UNITS = [
  { name: "Operasional", count: 24 },
  { name: "Logistik", count: 17 },
  { name: "Produksi", count: 11 },
];

type Status = "Selesai" | "Belum";

interface Case {
  date: string;
  name: string;
  np: string;
  unit: string;
  violation: string;
  status: Status;
}

const CASES: Case[] = [
  { date: "14 Agu 2026", name: "Rahmi Andayani", np: "NP-40821", unit: "Operasional", violation: "Terlambat masuk", status: "Belum" },
  { date: "13 Agu 2026", name: "Teguh Wicaksana", np: "NP-31577", unit: "Logistik", violation: "Tidak hadir tanpa keterangan", status: "Belum" },
  { date: "11 Agu 2026", name: "Nurul Fadhilah", np: "NP-51004", unit: "Keuangan", violation: "Terlambat masuk", status: "Selesai" },
  { date: "09 Agu 2026", name: "Anwar Setiadi", np: "NP-29140", unit: "Produksi", violation: "Pelanggaran seragam", status: "Belum" },
  { date: "07 Agu 2026", name: "Lestari Wulandari", np: "NP-60218", unit: "SDM", violation: "Meninggalkan tugas", status: "Selesai" },
  { date: "05 Agu 2026", name: "Guntur Prabowo", np: "NP-18336", unit: "Operasional", violation: "Terlambat masuk", status: "Selesai" },
  { date: "02 Agu 2026", name: "Sinta Maharani", np: "NP-77452", unit: "Logistik", violation: "Pelanggaran seragam", status: "Belum" },
];

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className="rounded px-3 py-1 text-[11px] font-bold text-white"
      style={{ background: status === "Selesai" ? DONE : BERAT }}
    >
      {status}
    </span>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-gray-100 bg-white shadow-sm ${className}`}>
      <div className="border-b border-gray-100 px-4 pb-1.5 pt-3">
        <h3 className="text-[13px] font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/** Stacked monthly bars — the "Rekap Bulanan" card. */
function MonthlyBars() {
  const max = Math.max(...MONTHLY.map((m) => m.ringan + m.sedang + m.berat));
  return (
    <div>
      <div className="flex h-[168px] items-end gap-3 px-1">
        {MONTHLY.map((m) => {
          const total = m.ringan + m.sedang + m.berat;
          return (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-[2px]"
                style={{ height: `${(total / max) * 140}px` }}
              >
                <span style={{ flex: m.ringan, background: RINGAN }} />
                <span style={{ flex: m.sedang, background: SEDANG }} />
                <span style={{ flex: m.berat, background: BERAT }} />
              </div>
              <span className="text-[10px] font-semibold text-gray-500">{m.month}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center gap-4">
        {[
          ["Ringan", RINGAN],
          ["Sedang", SEDANG],
          ["Berat", BERAT],
        ].map(([label, colour]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
            <span className="block h-2 w-2" style={{ background: colour }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Two-slice donut with the completion figure in the middle. */
function CompletionDonut({ percent }: { percent: number }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  return (
    <div>
      <svg viewBox="0 0 180 170" className="h-[168px] w-full" aria-hidden>
        <g transform="translate(90 82)">
          <circle r={r} fill="none" stroke={SEDANG} strokeWidth="25" />
          <circle
            r={r}
            fill="none"
            stroke={DONE}
            strokeWidth="25"
            strokeDasharray={`${(percent / 100) * c} ${c}`}
            transform="rotate(-90)"
            style={{ transition: "stroke-dasharray 600ms var(--ease-out-expo)" }}
          />
          <text textAnchor="middle" y="-2" className="fill-gray-900" fontSize="26" fontWeight="700">
            {percent}%
          </text>
          <text textAnchor="middle" y="16" className="fill-gray-500" fontSize="11" fontWeight="600">
            Selesai
          </text>
        </g>
      </svg>
      <div className="mt-1 flex justify-center gap-4">
        {[
          ["Selesai", DONE],
          ["Belum Selesai", SEDANG],
        ].map(([label, colour]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
            <span className="block h-2 w-2 rounded-full" style={{ background: colour }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EDisiplinMockup() {
  const [view, setView] = useState<(typeof NAV)[number]["id"]>("dashboard");
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");

  const open = expanded || pinned;

  const visible = useMemo(
    () =>
      CASES.filter(
        (c) =>
          (!statusFilter || c.status === statusFilter) &&
          (query === "" ||
            `${c.name} ${c.np} ${c.unit} ${c.violation}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, statusFilter],
  );

  const done = CASES.filter((c) => c.status === "Selesai").length;
  const percent = Math.round((done / CASES.length) * 100);

  return (
    <div className="flex h-full w-full" style={{ background: "#f3f4f6" }}>
      {/* Rail widens on hover and can be pinned — the behaviour of the real one. */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="flex shrink-0 flex-col overflow-hidden text-white"
        style={{ width: open ? 256 : 64, background: NAVY, transition: "width 150ms cubic-bezier(.2,.9,.2,1)" }}
      >
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-white/10 px-2">
          <button
            onClick={() => setPinned((p) => !p)}
            className="rounded-lg p-2 text-[15px] transition-colors hover:bg-white/10"
            aria-label={pinned ? "Lepas pin menu" : "Pin menu tetap terbuka"}
          >
            {open ? (pinned ? "📌" : "📍") : "☰"}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors"
                style={{
                  background: active ? BLUE : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.65)",
                }}
              >
                <span className="w-4 shrink-0 text-center text-[13px]">{item.icon}</span>
                <span
                  className="truncate"
                  style={{ opacity: open ? 1 : 0, transition: "opacity 120ms linear" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-16 shrink-0 items-center justify-between px-6"
          style={{
            background: `linear-gradient(135deg, ${DEEP} 0%, #1e40af 50%, ${BLUE} 100%)`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <span />
          {/* A wordmark rather than the client's logo file. */}
          <span className="rounded-lg bg-white px-3 py-1 text-[15px] font-bold" style={{ color: DEEP }}>
            e-Disiplin
          </span>

          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white/50 bg-gradient-to-br from-rose-400 to-rose-600 text-[11px] font-bold text-white">
              AK
            </span>
            <span className="text-left text-white">
              <span className="block text-[11px] font-semibold">Admin Kepatuhan</span>
              <span className="block text-[11px] text-blue-200/70">admin_disiplin</span>
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {view === "dashboard" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-[22px] font-bold text-gray-900">Dashboard</h1>
                <p className="text-[11px] text-gray-400">
                  Total kasus terdaftar:{" "}
                  <span className="font-bold text-gray-700">{CASES.length + 62}</span>
                </p>
              </div>

              <div className="grid grid-cols-10 gap-4">
                <Card title="Rekap Bulanan" className="col-span-5">
                  <MonthlyBars />
                </Card>

                <Card title="Status Penyelesaian" className="col-span-3">
                  <CompletionDonut percent={percent} />
                </Card>

                <div className="col-span-2">
                  <div
                    className="h-full rounded-xl"
                    style={{ background: "linear-gradient(to bottom right, #2563eb, #1e40af)" }}
                  >
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 pb-2 pt-3">
                      <span className="text-[14px] text-yellow-300">🏆</span>
                      <div>
                        <p className="text-[13px] font-bold text-white">TOP FIVE</p>
                        <p className="text-[10px] text-white/60">Pelanggar</p>
                      </div>
                    </div>
                    <div className="space-y-0.5 p-3">
                      {VIOLATORS.map((v, i) => (
                        <div
                          key={v.np}
                          className="flex items-center gap-2 border-b border-white/10 py-1.5 last:border-0"
                        >
                          <span className="w-5 shrink-0 text-[11px] font-bold text-yellow-300">
                            {i + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-white">{v.name}</p>
                            <p className="text-[9px] text-white/50">{v.np}</p>
                          </div>
                          <span className="shrink-0 text-[11px] font-bold text-red-300">
                            {v.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card title="Top 3 Pelanggaran Unit Kerja">
                  <div className="space-y-3 py-2">
                    {UNITS.map((u, i) => (
                      <div key={u.name} className="flex items-center gap-2">
                        <span className="w-[76px] shrink-0 truncate text-[11px] text-gray-600">
                          {u.name}
                        </span>
                        <span className="h-[18px] flex-1 overflow-hidden rounded-sm bg-gray-100">
                          <span
                            className="block h-full rounded-sm"
                            style={{
                              width: `${(u.count / UNITS[0].count) * 100}%`,
                              background: ["#2563eb", "#1d4ed8", "#1e40af"][i],
                            }}
                          />
                        </span>
                        <span className="w-6 shrink-0 text-right text-[11px] font-bold text-gray-700">
                          {u.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Pelanggaran Bulan Ini" className="col-span-2">
                  <table className="w-full text-[11.5px]">
                    <thead>
                      <tr>
                        <th className="w-6 px-2 py-1.5 text-left font-semibold text-gray-600">No</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Nama</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-600">NP</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Pelanggaran</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CASES.slice(0, 5).map((c, i) => (
                        <tr key={c.np + c.date} className="border-t border-gray-100">
                          <td className="px-2 py-1.5 font-semibold text-gray-400">{i + 1}</td>
                          <td className="max-w-[110px] truncate px-2 py-1.5 font-medium text-gray-800">
                            {c.name}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-gray-600">{c.np}</td>
                          <td className="max-w-[130px] truncate px-2 py-1.5 text-gray-600">
                            {c.violation}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <StatusBadge status={c.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 py-1 text-center text-[11px] text-gray-500">
                    +{CASES.length + 9} lainnya — lihat di Rekap Pelanggaran
                  </p>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h1 className="text-[22px] font-bold text-gray-900">
                {view === "rekap" ? "Rekap Pelanggaran" : NAV.find((n) => n.id === view)?.label}
              </h1>

              {view === "rekap" ? (
                <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari nama pegawai, NP, atau no. kasus..."
                      className="h-[34px] min-w-[280px] flex-1 rounded-lg border border-gray-200 px-3 text-[12.5px] text-gray-800 outline-none focus:border-blue-400"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as "" | Status)}
                      className="h-[34px] rounded-lg border border-gray-200 px-2 text-[12.5px] text-gray-700"
                    >
                      <option value="">Semua Status</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Belum">Belum</option>
                    </select>
                  </div>

                  <table className="w-full text-[12px]">
                    <thead style={{ background: DEEP }} className="text-white">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tanggal</th>
                        <th className="px-4 py-3 text-left font-semibold">Nama Pegawai</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Unit Kerja</th>
                        <th className="px-4 py-3 text-left font-semibold">Pelanggaran</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Status</th>
                        <th className="w-8 px-2 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((c) => (
                        <tr key={c.np + c.date} className="border-b border-gray-100 hover:bg-blue-50/40">
                          <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{c.date}</td>
                          <td className="px-4 py-2.5">
                            <span className="block font-medium text-gray-800">{c.name}</span>
                            <span className="block font-mono text-[10.5px] text-gray-400">{c.np}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{c.unit}</td>
                          <td className="px-4 py-2.5 text-gray-600">{c.violation}</td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-2 py-2.5 text-center text-gray-300">›</td>
                        </tr>
                      ))}
                      {visible.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-[12.5px] text-gray-400">
                            Tidak ada kasus yang cocok.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid h-[380px] place-items-center rounded-lg border border-dashed border-gray-200 bg-white">
                  <p className="text-[12.5px] text-gray-400">
                    Halaman {NAV.find((n) => n.id === view)?.label} — di luar cakupan cuplikan ini.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
