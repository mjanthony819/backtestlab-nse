"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/", label: "backtest" },
  { href: "/trades/", label: "trades" },
  { href: "/compare/", label: "compare" },
  { href: "/about/", label: "method" },
];

export default function Nav() {
  const path = (usePathname() || "/").replace(/\/?$/, "/");
  const qs = useSearchParams().toString();
  const keep = qs ? "?" + qs : "";
  return (
    <header className="border-b border-line">
      <div className="mx-auto max-w-[1280px] px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-2">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-pixel text-[11px] text-ink">BACKTESTLAB</span>
          <span className="font-doto text-blue text-lg font-bold leading-none">NSE<span className="blink">_</span></span>
        </Link>
        <nav className="flex gap-1 text-[11px] uppercase tracking-wider">
          {TABS.map((t) => {
            const on = path === t.href;
            const about = t.href === "/about/";
            return (
              <Link key={t.href} href={t.href + (about ? "" : keep)}
                className={`px-3 py-1 border ${on ? "border-blue text-ink" : "border-transparent text-dim hover:text-ink"}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <a href="https://github.com/mjanthony819/backtestlab-nse" className="ml-auto text-faint hover:text-blue text-[11px]">source ↗</a>
      </div>
    </header>
  );
}
