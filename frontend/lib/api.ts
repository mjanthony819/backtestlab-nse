export const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export type Param = { key: string; label: string; default: number; min: number; max: number; step: number };
export type Strategy = { id: string; name: string; blurb: string; params: Param[] };
export type Ticker = { symbol: string; name: string; start: string | null; end: string | null };
export type Trade = { entry_date: string; entry_price: number; exit_date: string; exit_price: number; return: number; open: boolean };
export type Metrics = {
  total_return: number; cagr: number; sharpe: number; max_drawdown: number; volatility: number;
  exposure?: number; n_trades?: number; win_rate?: number | null; sharpe_ci90?: [number, number] | null;
};
export type Result = {
  ticker: string; strategy: string; params: Record<string, number>; data_source: string;
  data_range: [string, string]; window: [string, string]; dates: string[];
  equity: number[]; buy_hold_equity: number[]; benchmark_equity: number[] | null; drawdown: number[]; position: number[];
  metrics: Metrics; buy_hold_metrics: Metrics; benchmark_metrics: Metrics | null; trades: Trade[];
};
export type Query = {
  ticker: string; strategy: string; params: Record<string, number>; start: string; end: string; cost_bps: number;
};

async function get<T>(path: string): Promise<T> {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export const getTickers = () => get<{ tickers: Ticker[]; updated: string | null; benchmark: { end?: string } }>("/tickers");
export const getStrategies = () => get<{ strategies: Strategy[] }>("/strategies").then((d) => d.strategies);

export async function backtest(q: Query, signal?: AbortSignal): Promise<Result> {
  const r = await fetch(API + "/backtest", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ ticker: q.ticker, strategy: q.strategy, params: q.params, start: q.start || null, end: q.end || null, cost_bps: q.cost_bps }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || `Server error ${r.status}`);
  return j;
}
