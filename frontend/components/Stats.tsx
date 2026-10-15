import { Metrics } from "@/lib/api";
import { num, pct, spct } from "@/lib/fmt";

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="box px-4 py-3">
      <div className="cap">{label}</div>
      <div className={`font-doto text-[28px] font-bold leading-tight mt-1 ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink"}`}>{value}</div>
      {sub && <div className="text-[11px] text-faint">{sub}</div>}
    </div>
  );
}

export default function Stats({ m, bh, nifty }: { m: Metrics; bh: Metrics; nifty: Metrics | null }) {
  const ci = m.sharpe_ci90;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <Card label="CAGR" value={pct(m.cagr)} tone={m.cagr >= 0 ? "up" : "down"} sub={`buy&hold ${pct(bh.cagr)}${nifty ? ` · nifty ${pct(nifty.cagr)}` : ""}`} />
      <Card label="Sharpe" value={num(m.sharpe)} sub={ci ? `90% CI ${num(ci[0])} to ${num(ci[1])}` : "6.5% risk-free"} />
      <Card label="Max drawdown" value={pct(m.max_drawdown)} tone="down" sub={`buy&hold ${pct(bh.max_drawdown)}`} />
      <Card label="Win rate" value={m.win_rate == null ? "-" : pct(m.win_rate, 0)} sub="of closed round trips" />
      <Card label="Trades" value={String(m.n_trades ?? 0)} sub={`total return ${spct(m.total_return, 0)}`} />
      <Card label="Exposure" value={pct(m.exposure, 0)} sub="share of days invested" />
    </div>
  );
}
