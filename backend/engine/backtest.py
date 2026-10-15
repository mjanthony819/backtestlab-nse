"""Position -> returns, with costs. Convention: the signal is known at the close
of day t, the trade is filled at the open of day t+1, and every change in
position pays cost_bps on the traded notional."""
import numpy as np
import pandas as pd

RF_ANNUAL = 0.065
RF_DAILY = (1 + RF_ANNUAL) ** (1 / 252) - 1


def strategy_returns(df: pd.DataFrame, signal: pd.Series, cost_bps: float = 10.0):
    cost = cost_bps / 1e4
    held = signal.shift(1).fillna(0.0)          # position during day u = signal at close u-1
    prev = held.shift(1).fillna(0.0)
    o = df.Open.fillna(df.Close)
    c = df.Close
    pc = c.shift(1)
    full = c / pc - 1                           # held through the day
    enter = c / o - 1                           # filled at the open, held to the close
    leave = o / pc - 1                          # held to the open, then sold
    gross = np.where((held == 1) & (prev == 1), full,
             np.where((held == 1) & (prev == 0), enter,
              np.where((held == 0) & (prev == 1), leave, 0.0)))
    gross = pd.Series(gross, index=df.index).fillna(0.0)
    turnover = (held - prev).abs()
    return gross - cost * turnover, held, turnover


def equity(ret: pd.Series) -> pd.Series:
    return (1 + ret).cumprod()


def drawdown(eq: pd.Series) -> pd.Series:
    return eq / eq.cummax().clip(lower=1) - 1


def sharpe(ret, rf=RF_DAILY):
    sd = np.std(ret, ddof=1)
    return float((np.mean(ret) - rf) / sd * np.sqrt(252)) if sd > 0 else 0.0


def metrics(ret: pd.Series, held: pd.Series | None = None, trades: list | None = None) -> dict:
    eq = equity(ret)
    n = max(len(ret), 1)
    m = {
        "total_return": float(eq.iloc[-1] - 1),
        "cagr": float(eq.iloc[-1] ** (252 / n) - 1),
        "sharpe": sharpe(ret.to_numpy()),
        "max_drawdown": float(drawdown(eq).min()),
        "volatility": float(ret.std() * np.sqrt(252)),
    }
    if held is not None:
        m["exposure"] = float(held.mean())
    if trades is not None:
        m["n_trades"] = len(trades)
        m["win_rate"] = float(np.mean([t["return"] > 0 for t in trades])) if trades else None
    return m


def extract_trades(df, held, cost_bps):
    """Round trips from position changes. Entry/exit prices are the fill prices (opens)."""
    cost = cost_bps / 1e4
    o = df.Open.fillna(df.Close)
    trades, entry = [], None
    h = held.to_numpy()
    prev = 0.0
    for i, d in enumerate(df.index):
        if h[i] == 1 and prev == 0:
            entry = (d, float(o.iloc[i]))
        elif h[i] == 0 and prev == 1 and entry:
            px = float(o.iloc[i])
            trades.append(_trade(entry, d, px, cost, False))
            entry = None
        prev = h[i]
    if entry:
        trades.append(_trade(entry, df.index[-1], float(df.Close.iloc[-1]), cost, True))
    return trades


def _trade(entry, d, px, cost, open_):
    r = px / entry[1] * (1 - cost) / (1 + cost) - 1 if not open_ else px / entry[1] * (1 - cost) - 1
    return {"entry_date": entry[0].strftime("%Y-%m-%d"), "entry_price": round(entry[1], 2),
            "exit_date": d.strftime("%Y-%m-%d"), "exit_price": round(px, 2),
            "return": float(r), "open": open_}


def run(df, signal, start=None, end=None, cost_bps=10.0):
    """Signal is computed on full history (indicator warm-up), then the window is cut.
    The first day of the window starts flat so no pre-window position leaks in."""
    ret, held, _ = strategy_returns(df, signal, cost_bps)
    window = slice(start, end)
    win = df.loc[window]
    if len(win) < 30:
        raise ValueError("Date range has fewer than 30 trading days of data")
    # re-run on the window so the first position is entered (and costed) inside it
    ret, held, _ = strategy_returns(win, signal.loc[win.index], cost_bps)
    ret.iloc[0] = 0.0
    trades = extract_trades(win, held, cost_bps)
    return win, ret, held, trades
