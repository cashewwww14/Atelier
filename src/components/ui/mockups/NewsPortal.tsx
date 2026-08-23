"use client";

import { useState } from "react";
import { Chip, INK } from "./shared";

const ACCENT = "#8A473C";

interface Article {
  id: string;
  cat: string;
  title: string;
  excerpt: string;
  body: string[];
  author: string;
  time: string;
  hue: number;
}

/** Invented headlines — placeholder editorial, not real articles. */
const ARTICLES: Article[] = [
  {
    id: "a1", cat: "City", hue: 28, author: "Newsroom", time: "2 hours ago",
    title: "Pasar lama dibuka kembali setelah dua tahun direnovasi",
    excerpt: "Pedagang mulai menempati kios sejak pekan lalu. Pengelola menyebut penataan ulang lorong menambah kapasitas hampir sepertiga.",
    body: [
      "Pengelola menyatakan seluruh kios di blok utama sudah terisi, sementara blok belakang menyusul bulan depan.",
      "Penataan lorong yang sebelumnya berkelok dibuat lurus, sehingga jalur bongkar muat tidak lagi memotong area pembeli.",
    ],
  },
  {
    id: "a2", cat: "Economy", hue: 96, author: "Newsroom", time: "3 hours ago",
    title: "Harga bahan pokok stabil menjelang akhir bulan",
    excerpt: "Pantauan di empat pasar menunjukkan pergerakan harga di bawah satu persen sepanjang pekan ini.",
    body: ["Stok beras dan minyak goreng disebut mencukupi hingga awal bulan depan."],
  },
  {
    id: "a3", cat: "Technology", hue: 232, author: "Newsroom", time: "5 hours ago",
    title: "Kampus luncurkan pusat komputasi bersama",
    excerpt: "Fasilitas ini terbuka untuk penelitian lintas jurusan dengan sistem antrean terjadwal.",
    body: ["Kapasitas awal disiapkan untuk sekitar empat puluh pekerjaan paralel."],
  },
  {
    id: "a4", cat: "Sport", hue: 12, author: "Newsroom", time: "7 hours ago",
    title: "Tim junior lolos ke babak nasional",
    excerpt: "Kemenangan di laga terakhir memastikan satu tempat di putaran berikutnya.",
    body: ["Pelatih menyebut rotasi pemain jadi kunci menjaga stamina sepanjang turnamen."],
  },
];

const DRAFTS = [
  { t: "Draf: Rencana jalur sepeda", s: "Waiting" as const },
  { t: "Revisi: Laporan anggaran", s: "Needs edit" as const },
  { t: "Draf: Wawancara pelatih", s: "Waiting" as const },
];

function Thumb({ hue, className = "" }: { hue: number; className?: string }) {
  return (
    <span
      className={`block ${className}`}
      style={{
        background: `linear-gradient(150deg, oklch(0.84 0.08 ${hue}), oklch(0.66 0.11 ${(hue + 40) % 360}))`,
      }}
    />
  );
}

export function NewsPortalMockup() {
  const [reading, setReading] = useState<Article | null>(null);
  const [drafts, setDrafts] = useState(DRAFTS);
  const [published, setPublished] = useState(0);

  const lead = ARTICLES[0];
  const grid = ARTICLES.slice(1);

  return (
    <div className="flex h-full w-full flex-col" style={{ background: INK.bg, color: INK.ink }}>
      {/* Editor bar — the half of the app that was the actual work. */}
      <div
        className="flex items-center justify-between px-8 py-2"
        style={{ background: "#f7ece9", borderBottom: `1px solid ${INK.line}` }}
      >
        <div className="flex items-center gap-4 text-[11.5px]" style={{ color: INK.secondary }}>
          <span style={{ color: ACCENT }}>● Editor mode</span>
          <span>New article</span>
          <span>Moderation ({drafts.length})</span>
          <span>Published today ({published})</span>
        </div>
        <span className="text-[11.5px]" style={{ color: INK.muted }}>
          signed in as admin
        </span>
      </div>

      <header
        className="flex items-center justify-between px-8 py-5"
        style={{ borderBottom: `1px solid ${INK.line}` }}
      >
        <button onClick={() => setReading(null)} className="text-left">
          <p className="text-[26px] font-bold leading-none tracking-tight" style={{ fontFamily: "var(--font-garamond)" }}>
            The Daily Word
          </p>
          <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.18em]" style={{ color: INK.faint }}>
            Saturday, 16 August 2026
          </p>
        </button>
        <nav className="flex gap-5 text-[12.5px]" style={{ color: INK.secondary }}>
          {["Home", "City", "Economy", "Technology", "Sport", "Opinion"].map((n, i) => (
            <button key={n} style={{ color: i === 0 ? ACCENT : undefined }}>
              {n}
            </button>
          ))}
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_282px] gap-7 overflow-hidden px-8 py-6">
        <div className="flex min-w-0 flex-col overflow-y-auto">
          {reading ? (
            <article>
              <button
                onClick={() => setReading(null)}
                className="mb-4 text-[12px]"
                style={{ color: ACCENT }}
              >
                ← Back to the front page
              </button>
              <Chip>{reading.cat}</Chip>
              <h2
                className="mt-3 text-[30px] font-bold leading-[1.14] tracking-tight"
                style={{ fontFamily: "var(--font-garamond)" }}
              >
                {reading.title}
              </h2>
              <p className="mt-2.5 text-[11.5px]" style={{ color: INK.faint }}>
                {reading.author} · {reading.time}
              </p>
              <Thumb hue={reading.hue} className="mt-5 h-[180px] w-full rounded-lg" />
              <p className="mt-5 text-[14.5px] leading-relaxed" style={{ color: INK.secondary }}>
                {reading.excerpt}
              </p>
              {reading.body.map((p) => (
                <p key={p} className="mt-3.5 text-[13.5px] leading-relaxed" style={{ color: INK.secondary }}>
                  {p}
                </p>
              ))}
            </article>
          ) : (
            <>
              <button onClick={() => setReading(lead)} className="flex gap-5 text-left">
                <Thumb hue={lead.hue} className="h-[190px] w-[330px] shrink-0 rounded-lg" />
                <div className="min-w-0">
                  <Chip>{lead.cat}</Chip>
                  <h2
                    className="mt-2.5 text-[27px] font-bold leading-[1.16] tracking-tight"
                    style={{ fontFamily: "var(--font-garamond)" }}
                  >
                    {lead.title}
                  </h2>
                  <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: INK.secondary }}>
                    {lead.excerpt}
                  </p>
                  <p className="mt-3.5 text-[11.5px]" style={{ color: INK.faint }}>
                    {lead.author} · {lead.time}
                  </p>
                </div>
              </button>

              <div className="my-5 h-px" style={{ background: INK.line }} />

              <div className="grid grid-cols-3 gap-4">
                {grid.map((a) => (
                  <button key={a.id} onClick={() => setReading(a)} className="text-left">
                    <Thumb hue={a.hue} className="h-[96px] w-full rounded-md" />
                    <p className="mt-2.5 text-[10.5px] uppercase tracking-wide" style={{ color: ACCENT }}>
                      {a.cat}
                    </p>
                    <h3 className="mt-1 text-[13px] font-semibold leading-snug">{a.title}</h3>
                    <p className="mt-1.5 text-[10.5px]" style={{ color: INK.faint }}>
                      {a.time}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-5 overflow-y-auto">
          <div className="rounded-lg px-4 py-4" style={{ background: INK.panel, border: `1px solid ${INK.line}` }}>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: INK.faint }}>
              Most read
            </p>
            <ol className="mt-3 space-y-3">
              {ARTICLES.map((a, i) => (
                <li key={a.id}>
                  <button onClick={() => setReading(a)} className="flex gap-2.5 text-left">
                    <span className="font-mono text-[15px] font-semibold leading-none" style={{ color: ACCENT, opacity: 0.55 }}>
                      {i + 1}
                    </span>
                    <span className="text-[12px] leading-snug" style={{ color: INK.secondary }}>
                      {a.title}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg px-4 py-4" style={{ background: INK.panel, border: `1px solid ${INK.line}` }}>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: INK.faint }}>
              Moderation queue
            </p>
            <div className="mt-3 space-y-2.5">
              {drafts.map((d) => (
                <div key={d.t} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11.5px]" style={{ color: INK.secondary }}>
                    {d.t}
                  </span>
                  <button
                    onClick={() => {
                      setDrafts((p) => p.filter((x) => x.t !== d.t));
                      setPublished((n) => n + 1);
                    }}
                    className="shrink-0 rounded-full px-2.5 py-[3px] text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: ACCENT }}
                  >
                    Publish
                  </button>
                </div>
              ))}
              {drafts.length === 0 && (
                <p className="py-3 text-[11.5px]" style={{ color: INK.muted }}>
                  Queue is empty.
                </p>
              )}
            </div>
          </div>

          <p className="mt-auto font-mono text-[10px] leading-relaxed" style={{ color: INK.faint }}>
            PHP 8 · MySQL · hand-rolled sessions
          </p>
        </aside>
      </div>
    </div>
  );
}
