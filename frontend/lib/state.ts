"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Query } from "./api";

export const DEFAULTS: Query = { ticker: "RELIANCE", strategy: "sma_cross", params: {}, start: "2016-01-01", end: "", cost_bps: 10 };

export function parse(sp: URLSearchParams): Query {
  const params: Record<string, number> = {};
  sp.forEach((v, k) => { if (k.startsWith("p_") && v !== "" && !isNaN(+v)) params[k.slice(2)] = +v; });
  return {
    ticker: sp.get("t") || DEFAULTS.ticker, strategy: sp.get("s") || DEFAULTS.strategy, params,
    start: sp.get("from") ?? DEFAULTS.start, end: sp.get("to") ?? DEFAULTS.end,
    cost_bps: sp.has("c") && !isNaN(+sp.get("c")!) ? +sp.get("c")! : DEFAULTS.cost_bps,
  };
}

export function serialize(q: Query, extra?: Record<string, string>): string {
  const sp = new URLSearchParams();
  sp.set("t", q.ticker); sp.set("s", q.strategy);
  Object.entries(q.params).forEach(([k, v]) => sp.set("p_" + k, String(v)));
  if (q.start) sp.set("from", q.start);
  if (q.end) sp.set("to", q.end);
  sp.set("c", String(q.cost_bps));
  Object.entries(extra || {}).forEach(([k, v]) => sp.set(k, v));
  return sp.toString();
}

/** Query state that lives in the URL, so every view is a shareable link. */
export function useQueryState() {
  const sp = useSearchParams();
  const router = useRouter();
  const q = useMemo(() => parse(new URLSearchParams(sp.toString())), [sp]);
  const set = useCallback((patch: Partial<Query>) => {
    const next = { ...q, ...patch };
    router.replace("?" + serialize(next, keepExtra(sp)), { scroll: false });
  }, [q, router, sp]);
  return { q, set, qs: sp.toString() };
}

function keepExtra(sp: URLSearchParams) {
  const out: Record<string, string> = {};
  ["a", "b", "d"].forEach((k) => { const v = sp.get(k); if (v) out[k] = v; });
  return out;
}
