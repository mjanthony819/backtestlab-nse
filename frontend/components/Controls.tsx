"use client";
import { useEffect, useState, useId, useRef } from "react";
import { getStrategies, getTickers, Query, Strategy, Ticker } from "@/lib/api";

type Choice = { value: string; label: string; detail?: string };

/** HTML-only menus: never invoke the mobile browser's native select UI. */
export function Dropdown({ label, value, options, onChange, searchable = false }:
  { label: string; value: string; options: Choice[]; onChange: (value: string) => void; searchable?: boolean }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const term = query.trim().toUpperCase();
  const filtered = options.filter((o) => !searchable || `${o.value} ${o.label} ${o.detail || ""}`.toUpperCase().includes(term));
  const choices = searchable && term && !options.some((o) => o.value.toUpperCase() === term)
    ? [...filtered, { value: term, label: `Use ${term}`, detail: "Load this NSE symbol live" }] : filtered;
  const selected = options.find((o) => o.value === value);
  const close = (focus = false) => { setOpen(false); if (focus) trigger.current?.focus(); };
  const choose = (v: string) => { onChange(v); close(true); };
  const show = () => {
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    if (searchable) search.current?.focus();
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, searchable]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(true); return; }
    if (e.key === "Tab") { close(); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      if (searchable && ["Home", "End"].includes(e.key)) return;
      e.preventDefault();
      if (!open) { show(); return; }
      setActive((n) => e.key === "Home" ? 0 : e.key === "End" ? choices.length - 1
        : Math.max(0, Math.min(choices.length - 1, n + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (open && (e.key === "Enter" || (!searchable && e.key === " "))) {
      e.preventDefault(); if (choices[active]) choose(choices[active].value);
    } else if (!searchable && open && e.key.length === 1) {
      e.preventDefault();
      typed.current = { text: (Date.now() - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: Date.now() };
      const n = choices.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (n >= 0) setActive(n);
    }
  };
  return (
    <div ref={root} className="custom-dropdown" style={{ zIndex: open ? 40 : undefined }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) close(); }}>
      <style>{`
        .custom-dropdown { position: relative; width: 100%; min-width: 0; }
        .custom-trigger { width: 100%; min-height: 44px; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #05080f; border: 1px solid #1a2839; color: #dde6f2; padding: 8px; font-size: 12px; }
        .custom-trigger:focus-visible, .custom-trigger[aria-expanded=true] { outline: 1px solid #3aa4ff; outline-offset: 1px; }
        .custom-panel { position: absolute; top: calc(100% + 4px); left: 0; width: 100%; background: #070c16; border: 1px solid #3aa4ff; box-shadow: 0 12px 30px #000b; }
        .custom-search { padding: 8px; border-bottom: 1px solid #1a2839; }
        .custom-search input { min-height: 44px; font-size: 16px; }
        .custom-options { max-height: min(280px, 40vh); overflow-y: auto; overscroll-behavior: contain; }
        .custom-option { display: block; width: 100%; min-height: 44px; padding: 10px; color: #dde6f2; text-align: left; font-size: 12px; overflow-wrap: anywhere; border-bottom: 1px solid #14202f; }
        .custom-option[data-active=true], .custom-option:hover { background: #10243e; color: #fff; }
        .custom-option[aria-selected=true] { box-shadow: inset 3px 0 #3aa4ff; }
        .custom-option small { display: block; color: #8494a9; font-size: 10px; }
      `}</style>
      <button ref={trigger} type="button" className="custom-trigger" aria-label={label}
        role={searchable ? undefined : "combobox"} aria-haspopup="listbox" aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={!searchable && open && choices[active] ? `${id}-${active}` : undefined}
        onKeyDown={keys} onClick={() => open ? close() : show()}>
        <span>{selected?.label || value || "Choose..."}</span><span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && <div className="custom-panel">
        {searchable && <div className="custom-search"><input ref={search} value={query} autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
          role="combobox" aria-label={`Search ${label}`} aria-autocomplete="list" aria-expanded={true} aria-controls={`${id}-list`}
          aria-activedescendant={choices[active] ? `${id}-${active}` : undefined} placeholder="Search symbol or company"
          onKeyDown={keys} onChange={(e) => { setQuery(e.target.value); setActive(0); }} /></div>}
        <div id={`${id}-list`} role="listbox" aria-label={label} className="custom-options">
          {choices.map((o, i) => <button type="button" role="option" tabIndex={-1} key={o.value} id={`${id}-${i}`}
            className="custom-option" aria-selected={o.value === value} data-active={i === active}
            onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o.value)}>
            {o.label}{o.detail && <small>{o.detail}</small>}
          </button>)}
          {!choices.length && <p className="p-3 text-faint text-[11px]">No options available.</p>}
        </div>
      </div>}
    </div>
  );
}

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
  const tk = meta.tickers.find((t) => t.symbol === q.ticker.toUpperCase().replace(".NS", ""));

  return (
    <div className="box p-4 space-y-5">
      <div>
        <div className="cap mb-2">stock</div>
        <Dropdown label="Stock" value={q.ticker} searchable
          options={meta.tickers.map((t) => ({ value: t.symbol, label: t.symbol, detail: t.name }))}
          onChange={(ticker) => set({ ticker })} />
        <p className="text-[11px] text-faint mt-1">
          {tk ? <>{tk.name}{tk.start ? <> · data {tk.start} → {tk.end}</> : null}</> : "Any NSE symbol works. Not in the cached list, so it loads live from Yahoo."}
        </p>
      </div>

      <div>
        <div className="cap mb-2">strategy</div>
        <Dropdown label="Strategy" value={q.strategy}
          options={meta.strategies.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(strategy) => set({ strategy, params: {} })} />
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
