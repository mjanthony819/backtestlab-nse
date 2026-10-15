"use client";
import { useEffect, useRef, useState } from "react";
import { backtest, Query, Result } from "./api";

/** Runs a backtest whenever the query changes (debounced). `slow` flips on if the
 *  server takes more than 2.5s, which on the free tier means it was asleep. */
export function useBacktest(q: Query | null, delay = 300) {
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const key = q ? JSON.stringify(q) : "";
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!q) return;
    const t = setTimeout(async () => {
      ctl.current?.abort();
      const c = new AbortController();
      ctl.current = c;
      setLoading(true); setErr(null);
      const s = setTimeout(() => setSlow(true), 2500);
      try {
        const r = await backtest(q, c.signal);
        if (!c.signal.aborted) { setRes(r); setSlow(false); }
      } catch (e: any) {
        if (e?.name !== "AbortError") { setErr(e.message === "Failed to fetch" ? "Cannot reach the API." : e.message); setRes(null); }
      } finally {
        clearTimeout(s);
        if (!c.signal.aborted) { setLoading(false); setSlow(false); }
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { res, err, loading, slow };
}
