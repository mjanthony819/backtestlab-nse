"use client";
import { Suspense, useMemo, useState } from "react";
import Controls, { useMeta } from "@/components/Controls";
import Chart from "@/components/Chart";
import Stats from "@/components/Stats";
import { ErrorBox, WakeBanner } from "@/components/Banner";
import { useQueryState } from "@/lib/state";
import { useBacktest } from "@/lib/useBacktest";
import { num, pct } from "@/lib/fmt";

function Backtest() {
  const { q, set } = useQueryState();
  const meta = useMeta();
  const ready = meta.strategies.length > 0;
  const { res, err, loading, slow } = useBacktest(ready ? q : null);
  const [log, setLog] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => res ? [
    { name: "Strategy", color: "#3aa4ff", values: res.equity, width: 2 },
    { name: "Buy & hold", color: "#e8b24a", values: res.buy_hold_equity, width: 1 },
    ...(res.benchmark_equity ? [{ name: "Nifty 50", color: "#8494a9", values: res.benchmark_equity, width: 1, dashed: true }] : []),
  ] : [], [res]);
  const dd = useMemo(() => res ? [{ name: "Drawdown", color: "#ff6b7a", values: res.drawdown }] : [], [res]);
  const strat = meta.strategies.find((s) => s.id === q.strategy);

  return (
    <div className="pt-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-doto text-[34px] font-bold text-ink leading-none">
            {q.ticker.replace(".NS", "")} <span className="text-blue">/</span> {strat?.name ?? "..."}
          </h1>
          <p className="text-dim text-[12px] mt-2">
            {res ? <>Window {res.window[0]} to {res.window[1]} · {res.dates.length} trading days · data via {res.data_source === "cache" ? "nightly cache" : "live Yahoo"}</> : "Running..."}
          </p>
        </div>
        <button className="btn" onClick={() => { navigator.clipboard?.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? "link copied" : "copy share link"}
        </button>
      </div>

      <WakeBanner slow={slow || meta.waking} />
      {meta.error && <ErrorBox msg="Cannot reach the API. Is the backend running and NEXT_PUBLIC_API_URL set?" />}
      {err && <ErrorBox msg={err} />}

      <div className="grid lg:grid-cols-[300px_1fr] gap-5 items-start">
        <Controls q={q} set={set} meta={meta} />
        <div className={`space-y-5 min-w-0 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {res ? (
            <>
              <Stats m={res.metrics} bh={res.buy_hold_metrics} nifty={res.benchmark_metrics} />
              <div className="box">
                <div className="flex justify-between items-center px-3 pt-3"><span className="cap">equity, ₹1 start</span>
                  <label className="text-[11px] text-dim flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="!w-auto" checked={log} onChange={(e) => setLog(e.target.checked)} /> log scale
                  </label></div>
                <Chart dates={res.dates} lines={lines} log={log} height={380} fmt={(v) => v.toFixed(2)} />
              </div>
              <div className="box">
                <div className="px-3 pt-3"><span className="cap">drawdown from peak</span></div>
                <Chart dates={res.dates} lines={dd} area height={180} fmt={(v) => pct(v)} />
              </div>
              <div className="box overflow-x-auto">
                <table className="text-[12px]">
                  <thead><tr className="cap"><th>vs</th><th>CAGR</th><th>Sharpe</th><th>Max DD</th><th>Vol</th></tr></thead>
                  <tbody>
                    {[["Strategy", res.metrics], ["Buy & hold", res.buy_hold_metrics], ["Nifty 50", res.benchmark_metrics]].map(([n, m]: any) => m && (
                      <tr key={n}><td className="text-ink">{n}</td><td>{pct(m.cagr)}</td><td>{num(m.sharpe)}</td><td>{pct(m.max_drawdown)}</td><td>{pct(m.volatility)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-faint text-[11px]">
                Signals use data up to the close of day t. Trades fill at the next open. {((q.cost_bps) / 100).toFixed(2)}% is charged on each buy and sell. Sharpe uses a 6.5% risk-free rate. Adjusted prices, no taxes.
              </p>
            </>
          ) : !err && <div className="box h-[420px] grid place-items-center text-faint font-pixel text-[10px]">{ready ? "RUNNING BACKTEST" : "LOADING"}<span className="blink">_</span></div>}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Backtest /></Suspense>;
}
