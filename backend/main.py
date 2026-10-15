"""BacktestLab NSE API."""
import os
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from engine import backtest as bt
from engine import data, stats, strategies

app = FastAPI(title="BacktestLab NSE", version="1.0")
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


class Req(BaseModel):
    ticker: str
    strategy: str
    params: dict = Field(default_factory=dict)
    start: str | None = None
    end: str | None = None
    cost_bps: float = Field(10.0, ge=0, le=200)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/tickers")
def tickers():
    man = data.manifest()
    out = []
    for sym, name in data.NIFTY.items():
        m = man.get(data.yahoo_symbol(sym), {})
        out.append({"symbol": sym, "name": name, "start": m.get("start"), "end": m.get("end")})
    return {"tickers": out, "benchmark": man.get(data.BENCH, {}), "updated": man.get("_updated"),
            "note": "Any other NSE symbol also works; it is fetched live from Yahoo Finance."}


@app.get("/strategies")
def strategy_list():
    return {"strategies": strategies.schema()}


def _series(s: pd.Series, nd=5):
    return [round(float(v), nd) for v in s.to_numpy()]


@lru_cache(maxsize=256)
def _signal(ticker, sid, params_key, last_date, n):
    df, _ = data.load(ticker)
    return strategies.positions(sid, df, dict(params_key))


def compute(req: Req):
    if req.strategy not in strategies.STRATEGIES:
        raise HTTPException(400, f"Unknown strategy {req.strategy}")
    try:
        df, source = data.load(req.ticker)
        params = strategies.clean_params(req.strategy, req.params)
        sig = strategies.positions(req.strategy, df, params)
        win, ret, held, trades = bt.run(df, sig, req.start, req.end, req.cost_bps)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:  # yahoo failure etc
        raise HTTPException(502, f"Could not load data for {req.ticker}: {e}")
    eq = bt.equity(ret)
    # buy-and-hold: same engine, same costs
    bh_sig = pd.Series(1.0, index=win.index)
    bh_ret, bh_held, _ = bt.strategy_returns(win, bh_sig, req.cost_bps)
    bh_ret.iloc[0] = 0.0
    bh_eq = bt.equity(bh_ret)
    out = {
        "ticker": data.yahoo_symbol(req.ticker), "strategy": req.strategy, "params": params,
        "data_source": source, "data_range": [df.index[0].strftime("%Y-%m-%d"), df.index[-1].strftime("%Y-%m-%d")],
        "window": [win.index[0].strftime("%Y-%m-%d"), win.index[-1].strftime("%Y-%m-%d")],
        "dates": [d.strftime("%Y-%m-%d") for d in win.index],
        "equity": _series(eq), "buy_hold_equity": _series(bh_eq),
        "drawdown": _series(bt.drawdown(eq)), "position": [int(v) for v in held.to_numpy()],
        "metrics": bt.metrics(ret, held, trades),
        "buy_hold_metrics": bt.metrics(bh_ret),
        "trades": trades,
    }
    out["metrics"]["sharpe_ci90"] = stats.bootstrap_sharpe_ci(ret.to_numpy(), rf=bt.RF_DAILY)
    try:
        nifty, _ = data.load(data.BENCH)
        n = nifty["Close"].reindex(win.index).ffill().bfill()
        nr = n.pct_change().fillna(0.0)
        out["benchmark_equity"] = _series(bt.equity(nr))
        out["benchmark_metrics"] = bt.metrics(nr)
    except Exception:  # noqa: BLE001
        out["benchmark_equity"], out["benchmark_metrics"] = None, None
    return out


@app.post("/backtest")
def backtest(req: Req):
    return compute(req)
