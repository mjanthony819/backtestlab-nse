"use client";
import { useEffect, useRef, useState } from "react";

export type Line = { name: string; color: string; values: number[]; width?: number; dashed?: boolean };

/** Thin wrapper over lightweight-charts. `area` draws one filled series (used for drawdown). */
export default function Chart({ dates, lines, height = 360, log = false, area = false, fmt }:
  { dates: string[]; lines: Line[]; height?: number; log?: boolean; area?: boolean; fmt?: (v: number) => string }) {
  const el = useRef<HTMLDivElement>(null);
  const [legend, setLegend] = useState<{ date: string; vals: (number | undefined)[] } | null>(null);
  const f = fmt || ((v: number) => v.toFixed(2));

  useEffect(() => {
    let dispose = () => {};
    let dead = false;
    (async () => {
      const lc = await import("lightweight-charts");
      if (dead || !el.current) return;
      const chart = lc.createChart(el.current, {
        height, autoSize: true,
        layout: { background: { type: lc.ColorType.Solid, color: "#070c16" }, textColor: "#8494a9", fontFamily: "Space Mono, monospace", fontSize: 11 },
        grid: { vertLines: { color: "#0e1726" }, horzLines: { color: "#0e1726" } },
        rightPriceScale: { borderColor: "#1a2839", mode: log ? lc.PriceScaleMode.Logarithmic : lc.PriceScaleMode.Normal },
        timeScale: { borderColor: "#1a2839", fixLeftEdge: true, fixRightEdge: true, rightOffset: 0 },
        crosshair: { mode: 0, vertLine: { color: "#3aa4ff55", labelBackgroundColor: "#1663b8" }, horzLine: { color: "#3aa4ff55", labelBackgroundColor: "#1663b8" } },
        localization: { priceFormatter: f },
      });
      const series = lines.map((l) => {
        const s: any = area
          ? chart.addBaselineSeries({ baseValue: { type: "price", price: 0 }, topLineColor: l.color, bottomLineColor: l.color, topFillColor1: l.color + "00", topFillColor2: l.color + "00", bottomFillColor1: l.color + "11", bottomFillColor2: l.color + "55", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, priceFormat: { type: "custom", formatter: f, minMove: 0.0001 } })
          : chart.addLineSeries({ color: l.color, lineWidth: (l.width || 2) as any, lineStyle: l.dashed ? 2 : 0, priceLineVisible: false, lastValueVisible: false, priceFormat: { type: "custom", formatter: f, minMove: 0.0001 } });
        s.setData(dates.map((d, i) => ({ time: d, value: l.values[i] })));
        return s;
      });
      const fit = () => chart.timeScale().fitContent();
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(el.current);
      setTimeout(fit, 60);
      chart.subscribeCrosshairMove((p: any) => {
        if (!p.time) return setLegend(null);
        setLegend({ date: String(p.time), vals: series.map((s) => (p.seriesData.get(s) as any)?.value) });
      });
      dispose = () => { ro.disconnect(); chart.remove(); };
    })();
    return () => { dead = true; dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates, lines, height, log, area]);

  const last = lines.map((l) => l.values[l.values.length - 1]);
  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-3 py-2 text-[11px] border-b border-line min-h-[34px]">
        {lines.map((l, i) => (
          <span key={l.name} className="flex items-center gap-2">
            <i style={{ background: l.color, width: 10, height: 2, display: "inline-block" }} />
            <span className="text-dim">{l.name}</span>
            <span className="text-ink tabular-nums">{(legend?.vals[i] ?? last[i]) != null ? f((legend?.vals[i] ?? last[i]) as number) : ""}</span>
          </span>
        ))}
        <span className="ml-auto text-faint">{legend?.date ?? dates[dates.length - 1]}</span>
      </div>
      <div ref={el} style={{ height }} />
    </div>
  );
}
