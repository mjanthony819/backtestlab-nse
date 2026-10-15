"use client";
import { useEffect, useState } from "react";
import { getStrategies, getTickers, Query, Strategy, Ticker } from "@/lib/api";

export function useMeta() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    const w = setTimeout(() => setWaking(true), 2500);
    getTickers().then((d) => { setTickers(d.tickers); setUpdated(d.benchmark?.end || d.updated); setWaking(false); clearTimeout(w); }).catch(() => setError(true));
    getStrategies().then(setStrategies).catch(() => setError(true));
    return () => clearTimeout(w);
  }, []);
  return { tickers, strategies, updated, error, waking };
}

export function ParamSliders({ strat, values, onChange }:
  { strat?: Strategy; values: Record<string, number>; onChange: (p: Record<string, number>) => void }) {
  if (!strat || !strat.params.length) return <p className="text-faint text-[11px]">No parameters.</p>;
  return (
    <div className="space-y-3">
      {strat.params.map((p) => {
        const v = values[p.key] ?? p.default;
        return (
          <label key={p.key} className="block">
            <div className="flex justify-between text-[11px]"><span className="text-dim">{p.label}</span><span className="text-ink tabular-nums">{v}</span></div>
            <input type="range" min={p.min} max={p.max} step={p.step} value={v}
              onChange={(e) => onChange({ ...values, [p.key]: +e.target.value })} />
          </label>
        );
      })}
    </div>
  );
}

export default function Controls({ q, set, meta }: { q: Query; set: (p: Partial<Query>) => void; meta: ReturnType<typeof useMeta> }) {
  const strat = meta.strategies.find((s) => s.id === q.strategy);
  const [text, setText] = useState(q.ticker);
  useEffect(() => setText(q.ticker), [q.ticker]);
  const tk = meta.tickers.find((t) => t.symbol === q.ticker.toUpperCase().replace(".NS", ""));
  const commit = (v: string) => { const s = v.trim().toUpperCase(); if (s) set({ ticker: s }); };

  return (
    <div className="box p-4 space-y-5">
      <div>
        <div className="cap mb-2">stock</div>
        <input list="tickers" value={text} spellCheck={false}
          onChange={(e) => { setText(e.target.value); if (meta.tickers.some((t) => t.symbol === e.target.value.toUpperCase())) commit(e.target.value); }}
          onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit(text)} placeholder="RELIANCE" />
        <datalist id="tickers">{meta.tickers.map((t) => <option key={t.symbol} value={t.symbol}>{t.name}</option>)}</datalist>
        <p className="text-[11px] text-faint mt-1">
          {tk ? <>{tk.name}{tk.start ? <> · data {tk.start} → {tk.end}</> : null}</> : "Any NSE symbol works. Not in the cached list, so it loads live from Yahoo."}
        </p>
      </div>

      <div>
        <div className="cap mb-2">strategy</div>
        <select value={q.strategy} onChange={(e) => set({ strategy: e.target.value, params: {} })}>
          {meta.strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {strat && <p className="text-[11px] text-faint mt-1">{strat.blurb}</p>}
      </div>

      <div>
        <div className="cap mb-2">parameters</div>
        <ParamSliders strat={strat} values={q.params} onChange={(p) => set({ params: p })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label><div className="cap mb-2">from</div><input type="date" value={q.start} min="2012-01-01" onChange={(e) => set({ start: e.target.value })} /></label>
        <label><div className="cap mb-2">to</div><input type="date" value={q.end} onChange={(e) => set({ end: e.target.value })} /></label>
      </div>

      <label className="block">
        <div className="flex justify-between"><span className="cap">cost per trade</span><span className="text-ink text-[11px] tabular-nums">{(q.cost_bps / 100).toFixed(2)}%</span></div>
        <input type="range" min={0} max={50} step={1} value={q.cost_bps} onChange={(e) => set({ cost_bps: +e.target.value })} className="mt-2" />
        <p className="text-[11px] text-faint">Charged on every buy and every sell. 0.10% is a fair all-in guess for delivery trades (see method).</p>
      </label>
    </div>
  );
}
