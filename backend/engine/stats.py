import numpy as np


def bootstrap_sharpe_ci(ret, draws=1000, block=20, seed=2026, rf=0.0):
    """Circular moving-block bootstrap 90% interval for the annualised Sharpe."""
    a = np.asarray(ret, dtype=float)
    n = len(a)
    if n < 60:
        return None
    rng = np.random.default_rng(seed)
    nb = (n + block - 1) // block
    starts = rng.integers(0, n, size=(draws, nb))
    idx = ((starts[:, :, None] + np.arange(block)) % n).reshape(draws, -1)[:, :n]
    s = a[idx]
    sd = s.std(axis=1, ddof=1)
    # Same guard as engine.backtest.sharpe: a constant resample has sd ~1e-19
    # from floating-point noise, not 0, and would give Sharpe ~1e16 here.
    sh = np.where(sd > 1e-12, (s.mean(axis=1) - rf) / np.where(sd > 1e-12, sd, 1.0) * np.sqrt(252), 0.0)
    lo, hi = np.percentile(sh, [5, 95])
    return [float(lo), float(hi)]
