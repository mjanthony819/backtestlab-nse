"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useMeta, ParamSliders } from "@/components/Controls";
import Chart from "@/components/Chart";
import { ErrorBox, WakeBanner } from "@/components/Banner";
import { backtest, Query, Result, Strategy } from "@/lib/api";
import { parse, useQueryState } from "@/lib/state";
import { num, pct } from "@/lib/fmt";
import { useRouter, useSearchParams } from "next/navigation";

const COLORS = ["#3aa4ff", "#4fd1a0", "#c58bff"];
type Slot = { strategy: string; params: Record<string, number> };

const enc = (s: Slot) => s.strategy + "~" + Object.entries(s.params).map(([k, v]) => `${k}=${v}`).join(",");
const dec = (v: string | null, fallback: string): Slot => {
  if (!v) return { strategy: fallback, params: {} };
  const [strategy, rest] = v.split("~");
  const params: Record<string, number> = {};
  (rest || "").split(",").filter(Boolean).forEach((kv) => { const [k, x] = kv.split("="); if (!isNaN(+x)) params[k] = +x; });
  return { strategy, params };
};

function Compare() {
  const { q, set } = useQueryState();
  const sp = useSearchParams();
  const router = useRouter();
  const meta = useMeta();
  const slots = [dec(sp.get("a"), "sma_cross"), dec(sp.get("b"), "momentum"), sp.get("d") !== null ? dec(sp.get("d"), "") : null];
  const key = JSON.stringify([q.ticker, q.start, q.end, q.cost_bps, slots]);
  const [out, setOut] = useState<Result[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  const write = (next: (Slot | null)[]) => {
    const p = new URLSearchParams(sp.toString());
    (["a", "b", "d"] as const).forEach((k, i) => { const s = next[i]; if (s) p.set(k, enc(s)); else p.delete(k); });
    router.replace("?" + p.toString(), { scroll: false });
  };

  useEffect(() => {
    if (!meta.strategies.length) return;
    const t = setTimeout(async () => {
      setErr(null);
      const s = setTimeout(() => setSlow(true), 2500);
      try {
        const base: Query = { ...q };
        const rs = await Promise.all(slots.filter(Boolean).map((sl) => backtest({ ...base, strategy: sl!.strategy, params: sl!.params })));
        setOut(rs);
      } catch (e: any) { setErr(e.message); setOut([]); }
      clearTimeout(s); setSlow(false);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, meta.strategies.length]);

  const lines = useMemo(() => out.length ? [
    ...out.map((r, i) => ({ name: meta.strategies.find((s) => s.id === r.strategy)?.name ?? r.strategy, color: COLORS[i], values: r.equity, width: 2 })),
    { name: "Buy & hold", color: "#e8b24a", values: out[0].buy_hold_equity, width: 1 },
    ...(out[0].benchmark_equity ? [{ name: "Nifty 50", color: "#8494a9", values: out[0].benchmark_equity, width: 1, dashed: true }] : []),
  ] : [], [out, meta.strategies]);

  const rows = out.length ? [
    ...out.map((r, i) => ({ name: meta.strategies.find((s) => s.id === r.strategy)?.name ?? r.strategy, m: r.metrics, c: COLORS[i], trades: r.trades.length })),
    { name: "Buy & hold", m: out[0].buy_hold_metrics, c: "#e8b24a", trades: 1 },
    ...(out[0].benchmark_metrics ? [{ name: "Nifty 50", m: out[0].benchmark_metrics, c: "#8494a9", trades: 0 }] : []),
  ] : [];

  return (
    <div className="pt-6">
      <h1 className="font-doto text-[34px] font-bold text-ink leading-none mb-2">Compare</h1>
      <p className="text-dim text-[12px] mb-6">Two or three strategies on the same stock, same dates, same costs.</p>
      <WakeBanner slow={slow || meta.waking} />
      {err && <ErrorBox msg={err} />}

      <div className="box p-4 mb-5 grid md:grid-cols-4 gap-4">
        <label><div className="cap mb-2">stock</div>
          <input list="tk2" defaultValue={q.ticker} key={q.ticker} onBlur={(e) => e.target.value.trim() && set({ ticker: e.target.value.trim().toUpperCase() })}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
          <datalist id="tk2">{meta.tickers.map((t) => <option key={t.symbol} value={t.symbol}>{t.name}</option>)}</datalist></label>
        <label><div className="cap mb-2">from</div><input type="date" value={q.start} onChange={(e) => set({ start: e.target.value })} /></label>
        <label><div className="cap mb-2">to</div><input type="date" value={q.end} onChange={(e) => set({ end: e.target.value })} /></label>
        <label><div className="flex justify-between"><span className="cap">cost</span><span className="text-[11px] text-ink">{(q.cost_bps / 100).toFixed(2)}%</span></div>
          <input type="range" min={0} max={50} value={q.cost_bps} onChange={(e) => set({ cost_bps: +e.target.value })} className="mt-2" /></label>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-5">
        {slots.map((sl, i) => sl ? (
          <div key={i} className="box p-4">
            <div className="flex items-center gap-2 mb-3"><i style={{ background: COLORS[i], width: 10, height: 10, display: "inline-block" }} />
              <span className="cap">strategy {i + 1}</span>
              {i === 2 && <button className="ml-auto text-faint hover:text-down text-[11px]" onClick={() => write([slots[0], slots[1], null])}>remove</button>}</div>
            <select value={sl.strategy} onChange={(e) => write(slots.map((x, j) => (j === i ? { strategy: e.target.value, params: {} } : x)))}>
              {meta.strategies.filter((s) => s.id !== "buy_hold").map((s: Strategy) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="mt-4"><ParamSliders strat={meta.strategies.find((s) => s.id === sl.strategy)} values={sl.params}
              onChange={(p) => write(slots.map((x, j) => (j === i ? { ...sl, params: p } : x)))} /></div>
          </div>
        ) : (
          <button key={i} className="box p-4 text-faint hover:text-blue min-h-[120px]" onClick={() => write([slots[0], slots[1], { strategy: "bollinger", params: {} }])}>+ add a third</button>
        ))}
      </div>

      {out.length > 0 && (
        <div className="space-y-5">
          <div className="box"><div className="px-3 pt-3"><span className="cap">equity, ₹1 start · {out[0].ticker}</span></div>
            <Chart dates={out[0].dates} lines={lines} log={false} height={380} fmt={(v) => v.toFixed(2)} /></div>
          <div className="box overflow-x-auto">
            <table className="text-[12px]">
              <thead><tr className="cap"><th></th><th>CAGR</th><th>Sharpe</th><th>Max DD</th><th>Vol</th><th>Total</th><th>Trades</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.name}><td className="text-ink"><i style={{ background: r.c, width: 8, height: 8, display: "inline-block", marginRight: 8 }} />{r.name}</td>
                  <td>{pct(r.m.cagr)}</td><td>{num(r.m.sharpe)}</td><td>{pct(r.m.max_drawdown)}</td><td>{pct(r.m.volatility)}</td><td>{pct(r.m.total_return, 0)}</td><td>{r.trades || "-"}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() { return <Suspense fallback={null}><Compare /></Suspense>; }
