"use client";

import { useMemo, useState } from "react";
import { INK, Sparkline } from "./shared";

const ACCENT = "#1F7A68";

type Tab = "home" | "activity" | "scan" | "split";

interface Txn {
  id: number;
  name: string;
  cat: string;
  amount: number;
  time: string;
  via: "scan" | "tele" | "split" | "manual" | "in";
}

/** Fabricated sample data — no real transactions, merchants, or balances. */
const SEED: Txn[] = [
  { id: 1, name: "Warung Bu Lastri", cat: "Food & drink", amount: -32_000, time: "Today · 12:14", via: "scan" },
  { id: 2, name: "Fuel", cat: "Transport", amount: -50_000, time: "Today · 08:02", via: "tele" },
  { id: 3, name: "Incoming transfer", cat: "Income", amount: 750_000, time: "Yesterday · 19:40", via: "in" },
  { id: 4, name: "Shared coffee", cat: "Split bill", amount: -21_500, time: "Yesterday · 16:22", via: "split" },
  { id: 5, name: "Music subscription", cat: "Subscriptions", amount: -49_000, time: "2 days ago", via: "manual" },
];

const CATEGORIES = [
  { name: "Food & drink", icon: "🍜" },
  { name: "Transport", icon: "🛵" },
  { name: "Shopping", icon: "🛍️" },
  { name: "Subscriptions", icon: "▶️" },
];

const SCAN_RESULT = [
  { name: "Mixed rice", qty: 2, price: 24_000 },
  { name: "Iced tea", qty: 2, price: 8_000 },
  { name: "Crackers", qty: 1, price: 3_000 },
];

const rupiah = (n: number) => `${n < 0 ? "−" : ""}Rp${Math.abs(n).toLocaleString("id-ID")}`;
const icons: Record<Txn["via"], string> = { scan: "📷", tele: "✈️", split: "👥", manual: "✎", in: "↓" };

export function MoMentMockup() {
  const [tab, setTab] = useState<Tab>("home");
  const [txns, setTxns] = useState<Txn[]>(SEED);
  const [filter, setFilter] = useState<"all" | "out" | "in">("all");
  const [scanning, setScanning] = useState<"idle" | "working" | "done">("idle");
  const [items, setItems] = useState(SCAN_RESULT);
  const [people, setPeople] = useState(["Zaky", "Rani", "Dimas"]);
  const [assign, setAssign] = useState<Record<number, number>>({ 0: 0, 1: 1, 2: 2 });

  const balance = useMemo(() => 4_318_500 + txns.reduce((a, t) => a + t.amount, 0) - SEED.reduce((a, t) => a + t.amount, 0), [txns]);
  const spentByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txns) if (t.amount < 0) map.set(t.cat, (map.get(t.cat) ?? 0) + -t.amount);
    return map;
  }, [txns]);
  const totalSpent = [...spentByCat.values()].reduce((a, b) => a + b, 0) || 1;

  const visible = txns.filter((t) =>
    filter === "all" ? true : filter === "in" ? t.amount > 0 : t.amount < 0,
  );

  const addScanned = () => {
    const total = items.reduce((a, i) => a + i.price * i.qty, 0);
    setTxns((prev) => [
      { id: Date.now(), name: "Scanned receipt", cat: "Food & drink", amount: -total, time: "Just now", via: "scan" },
      ...prev,
    ]);
    setScanning("idle");
    setTab("home");
  };

  const splitTotals = people.map((_, pi) =>
    items.reduce((sum, item, ii) => (assign[ii] === pi ? sum + item.price * item.qty : sum), 0),
  );

  return (
    <div className="flex h-full w-full flex-col" style={{ background: INK.bg, color: INK.ink }}>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-2">
        {tab === "home" && (
          <>
            <header className="flex items-center justify-between pt-2">
              <div>
                <p className="text-[12.5px]" style={{ color: INK.muted }}>
                  Good evening,
                </p>
                <p className="text-[19px] font-semibold tracking-tight">Zaky</p>
              </div>
              <span
                className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold"
                style={{ background: "#e0f0ec", color: ACCENT }}
              >
                AZ
              </span>
            </header>

            <div
              className="mt-5 rounded-2xl p-5"
              style={{
                background: `linear-gradient(145deg, ${ACCENT}, #14594c)`,
                boxShadow: "0 14px 30px -18px rgba(31,122,104,0.65)",
              }}
            >
              <p className="text-[11.5px] font-medium tracking-wide text-white/75">AVAILABLE BALANCE</p>
              <p className="mt-1.5 font-mono text-[29px] font-semibold leading-none tracking-tight text-white tabular-nums">
                {rupiah(balance)}
              </p>
              <div className="mt-4 flex items-end justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10.5px] text-white/70">In</p>
                    <p className="font-mono text-[14px] font-semibold text-white tabular-nums">Rp5.250.000</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] text-white/70">Out</p>
                    <p className="font-mono text-[14px] font-semibold text-white tabular-nums">
                      {rupiah(totalSpent)}
                    </p>
                  </div>
                </div>
                <div className="opacity-90">
                  <Sparkline points={[38, 42, 36, 55, 48, 62, 58, 71, 66, 78]} accent="#ffffff" width={88} height={36} />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {([
                { icon: "📷", label: "Scan", to: "scan" },
                { icon: "👥", label: "Split", to: "split" },
                { icon: "✈️", label: "Telegram", to: "activity" },
                { icon: "＋", label: "Log", to: "activity" },
              ] as const).map((a) => (
                <button
                  key={a.label}
                  onClick={() => setTab(a.to)}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-3 transition-colors active:opacity-70"
                  style={{ background: INK.panel, border: `1px solid ${INK.line}` }}
                >
                  <span className="text-[16px] leading-none">{a.icon}</span>
                  <span className="text-[10.5px]" style={{ color: INK.secondary }}>
                    {a.label}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-[14.5px] font-semibold">August spending</p>
            <div className="mt-3 space-y-2.5">
              {CATEGORIES.map((c) => {
                const value = spentByCat.get(c.name) ?? 0;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-[14px]">{c.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12.5px]" style={{ color: INK.secondary }}>
                          {c.name}
                        </span>
                        <span className="shrink-0 font-mono text-[12px] tabular-nums">{rupiah(-value)}</span>
                      </div>
                      <div className="mt-1.5 h-[6px] overflow-hidden rounded-full" style={{ background: INK.panel }}>
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${(value / totalSpent) * 100}%`, background: ACCENT }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <p className="text-[14.5px] font-semibold">Recent</p>
              <button onClick={() => setTab("activity")} className="text-[11.5px]" style={{ color: ACCENT }}>
                See all
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {txns.slice(0, 3).map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </div>
          </>
        )}

        {tab === "activity" && (
          <>
            <p className="pt-3 text-[18px] font-semibold">Activity</p>
            <div className="mt-3 flex gap-2">
              {(["all", "out", "in"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="rounded-full px-3 py-1.5 text-[12px] capitalize transition-colors"
                  style={{
                    background: filter === f ? ACCENT : INK.panel,
                    color: filter === f ? "#fff" : INK.secondary,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                setTxns((p) => [
                  { id: Date.now(), name: "Quick note", cat: "Shopping", amount: -25_000, time: "Just now", via: "manual" },
                  ...p,
                ])
              }
              className="mt-4 w-full rounded-xl py-2.5 text-[13px] font-medium text-white transition-opacity active:opacity-80"
              style={{ background: ACCENT }}
            >
              ＋ Add transaction
            </button>

            <div className="mt-3 space-y-1">
              {visible.map((t) => (
                <Row key={t.id} t={t} onRemove={() => setTxns((p) => p.filter((x) => x.id !== t.id))} />
              ))}
              {visible.length === 0 && (
                <p className="py-10 text-center text-[13px]" style={{ color: INK.muted }}>
                  Nothing matches.
                </p>
              )}
            </div>
          </>
        )}

        {tab === "scan" && (
          <>
            <p className="pt-3 text-[18px] font-semibold">Scan a receipt</p>
            <p className="mt-1 text-[12.5px]" style={{ color: INK.muted }}>
              Photograph it and let the model read the line items.
            </p>

            <div
              className="mt-4 grid h-[168px] place-items-center rounded-xl"
              style={{ background: INK.panel, border: `1.5px dashed ${INK.line}` }}
            >
              {scanning === "working" ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[22px]">◌</span>
                  <p className="text-[12px]" style={{ color: INK.muted }}>
                    Reading items…
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[26px]">📷</span>
                  <p className="text-[12px]" style={{ color: INK.muted }}>
                    Tap to take a photo
                  </p>
                </div>
              )}
            </div>

            {scanning !== "done" ? (
              <button
                onClick={() => {
                  setScanning("working");
                  setTimeout(() => setScanning("done"), 900);
                }}
                disabled={scanning === "working"}
                className="mt-4 w-full rounded-xl py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: ACCENT }}
              >
                {scanning === "working" ? "Processing…" : "Scan"}
              </button>
            ) : (
              <>
                <p className="mt-5 text-[13px] font-semibold">Result — still editable</p>
                <div className="mt-2 space-y-2">
                  {items.map((it, i) => (
                    <div
                      key={it.name}
                      className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: INK.panel }}
                    >
                      <span className="min-w-0 flex-1 truncate text-[12.5px]">{it.name}</span>
                      <button
                        onClick={() =>
                          setItems((p) => p.map((x, xi) => (xi === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))
                        }
                        className="grid h-6 w-6 place-items-center rounded-md text-[13px]"
                        style={{ background: "#fff", border: `1px solid ${INK.line}` }}
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-mono text-[12px] tabular-nums">{it.qty}</span>
                      <button
                        onClick={() => setItems((p) => p.map((x, xi) => (xi === i ? { ...x, qty: x.qty + 1 } : x)))}
                        className="grid h-6 w-6 place-items-center rounded-md text-[13px]"
                        style={{ background: "#fff", border: `1px solid ${INK.line}` }}
                      >
                        ＋
                      </button>
                      <span className="w-[74px] shrink-0 text-right font-mono text-[12px] tabular-nums">
                        {rupiah(it.price * it.qty)}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addScanned}
                  className="mt-4 w-full rounded-xl py-2.5 text-[13px] font-medium text-white"
                  style={{ background: ACCENT }}
                >
                  Save {rupiah(-items.reduce((a, i) => a + i.price * i.qty, 0))}
                </button>
              </>
            )}
          </>
        )}

        {tab === "split" && (
          <>
            <p className="pt-3 text-[18px] font-semibold">Split bill</p>
            <p className="mt-1 text-[12.5px]" style={{ color: INK.muted }}>
              Tap an item to pass it to the next person.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {people.map((p, i) => (
                <span
                  key={p}
                  className="rounded-full px-3 py-1.5 text-[12px]"
                  style={{ background: i === 0 ? ACCENT : INK.panel, color: i === 0 ? "#fff" : INK.secondary }}
                >
                  {p}
                </span>
              ))}
              <button
                onClick={() => setPeople((p) => [...p, `Friend ${p.length + 1}`])}
                className="rounded-full px-3 py-1.5 text-[12px]"
                style={{ border: `1px dashed ${INK.line}`, color: INK.muted }}
              >
                ＋ person
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {items.map((it, i) => (
                <button
                  key={it.name}
                  onClick={() => setAssign((a) => ({ ...a, [i]: ((a[i] ?? 0) + 1) % people.length }))}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
                  style={{ background: INK.panel }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px]">{it.name}</span>
                    <span className="block text-[10.5px]" style={{ color: INK.muted }}>
                      {it.qty} × {rupiah(it.price)}
                    </span>
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: "#fff", color: ACCENT, border: `1px solid ${INK.line}` }}
                  >
                    {people[assign[i] ?? 0]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-xl p-4" style={{ background: "#e8f2ef" }}>
              <p className="text-[12px] font-semibold" style={{ color: ACCENT }}>
                Summary
              </p>
              <div className="mt-2.5 space-y-1.5">
                {people.map((p, i) => (
                  <div key={p} className="flex justify-between text-[12.5px]">
                    <span style={{ color: INK.secondary }}>{p}</span>
                    <span className="font-mono tabular-nums">{rupiah(splitTotals[i])}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <nav
        className="flex shrink-0 items-center justify-around px-4 pb-4 pt-2"
        style={{ borderTop: `1px solid ${INK.line}`, background: INK.bg }}
      >
        {([
          { id: "home", icon: "▦", label: "Home" },
          { id: "activity", icon: "≡", label: "Activity" },
          { id: "scan", icon: "📷", label: "Scan" },
          { id: "split", icon: "👥", label: "Split" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex flex-col items-center gap-1 px-3 py-1"
            style={{ color: tab === t.id ? ACCENT : INK.faint }}
          >
            <span className="text-[15px] leading-none">{t.icon}</span>
            <span className="text-[10px]">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Row({ t, onRemove }: { t: Txn; onRemove?: () => void }) {
  return (
    <div className="group flex items-center gap-3 py-2">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px]"
        style={{ background: INK.panel, color: INK.secondary }}
      >
        {icons[t.via]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]">{t.name}</p>
        <p className="text-[10.5px]" style={{ color: INK.muted }}>
          {t.time}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="px-1.5 text-[13px] opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: INK.faint }}
          aria-label={`Remove ${t.name}`}
        >
          ×
        </button>
      )}
      <span
        className="shrink-0 font-mono text-[13px] font-medium tabular-nums"
        style={{ color: t.amount > 0 ? ACCENT : INK.ink }}
      >
        {rupiah(t.amount)}
      </span>
    </div>
  );
}
