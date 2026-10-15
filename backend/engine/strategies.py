"""Rule-based strategies. Each takes a price frame and returns a 0/1 position
decided at the close of day t. The backtester fills it at the open of t+1."""
import numpy as np
import pandas as pd

from .indicators import bollinger, rsi, sma


def _stateful(enter: np.ndarray, exit_: np.ndarray) -> np.ndarray:
    pos = np.zeros(len(enter))
    on = 0.0
    for i in range(len(enter)):
        if on == 0.0 and enter[i]:
            on = 1.0
        elif on == 1.0 and exit_[i]:
            on = 0.0
        pos[i] = on
    return pos


def buy_hold(df, **_):
    return pd.Series(1.0, index=df.index)


def sma_cross(df, fast=20, slow=50, **_):
    f, s = sma(df.Close, int(fast)), sma(df.Close, int(slow))
    return ((f > s) & s.notna()).astype(float)


def rsi_reversion(df, period=14, buy_below=30, exit_above=50, **_):
    r = rsi(df.Close, int(period))
    return pd.Series(_stateful((r < buy_below).fillna(False).to_numpy(),
                               (r > exit_above).fillna(False).to_numpy()), index=df.index)


def momentum(df, lookback=252, skip=21, **_):
    """Long while the lookback-minus-skip return is positive (12-1 month by default)."""
    mom = df.Close.shift(int(skip)) / df.Close.shift(int(lookback)) - 1
    return (mom > 0).astype(float)


def bollinger_reversion(df, window=20, k=2.0, **_):
    lo, mid, _up = bollinger(df.Close, int(window), float(k))
    return pd.Series(_stateful((df.Close < lo).fillna(False).to_numpy(),
                               (df.Close > mid).fillna(False).to_numpy()), index=df.index)


def P(key, label, default, lo, hi, step, help=""):
    return dict(key=key, label=label, default=default, min=lo, max=hi, step=step, help=help)


STRATEGIES = {
    "buy_hold": dict(name="Buy and hold", fn=buy_hold, params=[],
                     blurb="Own the stock the whole time. The bar every other strategy has to beat."),
    "sma_cross": dict(name="SMA crossover", fn=sma_cross,
                      params=[P("fast", "Fast SMA (days)", 20, 2, 100, 1), P("slow", "Slow SMA (days)", 50, 5, 300, 1)],
                      blurb="Long when the fast average is above the slow one, in cash otherwise."),
    "rsi_reversion": dict(name="RSI mean reversion", fn=rsi_reversion,
                          params=[P("period", "RSI period", 14, 2, 30, 1), P("buy_below", "Buy below", 30, 5, 50, 1),
                                  P("exit_above", "Exit above", 50, 40, 90, 1)],
                          blurb="Buy oversold dips, sell once the stock has recovered."),
    "momentum": dict(name="Momentum (12-1)", fn=momentum,
                     params=[P("lookback", "Lookback (days)", 252, 60, 500, 5), P("skip", "Skip recent (days)", 21, 0, 60, 1)],
                     blurb="Long when the past year's return, skipping the latest month, is positive."),
    "bollinger": dict(name="Bollinger reversion", fn=bollinger_reversion,
                      params=[P("window", "Window (days)", 20, 5, 100, 1), P("k", "Band width (std devs)", 2.0, 0.5, 4.0, 0.1)],
                      blurb="Buy a close below the lower band, sell when price is back at the middle."),
}


def schema():
    return [dict(id=k, name=v["name"], blurb=v["blurb"], params=v["params"]) for k, v in STRATEGIES.items()]


def clean_params(sid: str, given: dict | None) -> dict:
    """Merge user params over defaults and clamp them to the declared range."""
    given = given or {}
    out = {}
    for p in STRATEGIES[sid]["params"]:
        v = given.get(p["key"], p["default"])
        v = min(max(float(v), p["min"]), p["max"])
        out[p["key"]] = int(v) if float(p["step"]).is_integer() else v
    if sid == "sma_cross" and out["fast"] >= out["slow"]:
        raise ValueError("Fast SMA must be shorter than slow SMA")
    return out


def positions(sid: str, df: pd.DataFrame, params: dict | None = None) -> pd.Series:
    return STRATEGIES[sid]["fn"](df, **clean_params(sid, params)).fillna(0.0)
