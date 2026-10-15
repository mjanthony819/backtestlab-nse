"use client";
import { Suspense, useMemo } from "react";
import Controls, { useMeta } from "@/components/Controls";
import { ErrorBox, WakeBanner } from "@/components/Banner";
import { useQueryState } from "@/lib/state";
import { useBacktest } from "@/lib/useBacktest";
import { num, pct, spct } from "@/lib/fmt";

function Trades() {
  const { q, set } = useQueryState();
  const meta = useMeta();
  const { res, err, slow } = useBacktest(meta.strategies.length ? q : null);

  const stats = useMemo(() => {
    if (!res || !res.trades.length) return null;
    const r = res.trades.map((t) => t.return);
    return { best: Math.max(...r), worst: Math.min(...r), avg: r.reduce((a, b) => a + b, 0) / r.length };
  }, [res]);

  const csv = () => {
    if (!res) return;
    const rows = [["entry_date", "entry_price", "exit_date", "exit_price", "return_pct_after_costs", "still_open"],
      ...res.trades.map((t) => [t.entry_date, t.entry_price, t.exit_date, t.exit_price, (t.return * 100).toFixed(3), t.open])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${res.ticker}_${res.strategy}_trades.csv`;
    a.click();
  };

  return (
    <div className="pt-6">
      <h1 className="font-doto text-[34px] font-bold text-ink leading-none mb-2">Trades</h1>
      <p className="text-dim text-[12px] mb-6">Every round trip behind the equity curve. Entry and exit are next-open fills, returns are after costs.</p>
      <WakeBanner slow={slow || meta.waking} />
      {err && <ErrorBox msg={err} />}
      <div className="grid lg:grid-cols-[300px_1fr] gap-5 items-start">
        <Controls q={q} set={set} meta={meta} />
        <div className="box min-w-0">
          <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-line text-[12px]">
            <span className="cap">{res ? `${res.ticker} · ${res.trades.length} trades` : "..."}</span>
            {stats && <span className="text-dim">avg <b className="text-ink">{spct(stats.avg, 2)}</b> · best <b className="text-up">{spct(stats.best)}</b> · worst <b className="text-down">{spct(stats.worst)}</b></span>}
            <button className="btn ml-auto" onClick={csv} disabled={!res}>download csv</button>
          </div>
          <div className="overflow-auto max-h-[640px]">
            <table className="text-[12px]">
              <thead className="sticky top-0 bg-panel"><tr className="cap"><th>#</th><th>entry</th><th>buy ₹</th><th>exit</th><th>sell ₹</th><th>return</th></tr></thead>
              <tbody>
                {res?.trades.map((t, i) => (
                  <tr key={i}>
                    <td className="text-faint">{i + 1}</td><td>{t.entry_date}</td><td>{num(t.entry_price)}</td>
                    <td>{t.exit_date}{t.open && <span className="text-amber ml-2">open</span>}</td><td>{num(t.exit_price)}</td>
                    <td className={t.return >= 0 ? "text-up" : "text-down"}>{spct(t.return, 2)}</td>
                  </tr>
                ))}
                {res && !res.trades.length && <tr><td colSpan={6} className="text-faint py-8 text-center">This strategy never traded in the window.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() { return <Suspense fallback={null}><Trades /></Suspense>; }
