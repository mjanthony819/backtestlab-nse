export const pct = (v: number | null | undefined, d = 1) => (v == null || !isFinite(v) ? "-" : `${(v * 100).toFixed(d)}%`);
export const spct = (v: number | null | undefined, d = 1) => (v == null ? "-" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}%`);
export const num = (v: number | null | undefined, d = 2) => (v == null || !isFinite(v) ? "-" : v.toFixed(d));
