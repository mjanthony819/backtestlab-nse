"""Behaviour pins for the rule-based strategies: synthetic series with a known shape
must produce the intended position, not just a binary no-lookahead one."""
import numpy as np
import pandas as pd
import pytest

from engine import backtest as bt
from engine import strategies as S


def frame(close):
    close = np.asarray(close, dtype=float)
    idx = pd.bdate_range("2024-01-01", periods=len(close))
    return pd.DataFrame({"Open": close, "High": close, "Low": close, "Close": close,
                         "Volume": 1e6}, index=idx)


def test_sma_cross_follows_the_trend_direction():
    up = S.sma_cross(frame(np.linspace(100, 200, 120)), fast=5, slow=20)
    assert up.iloc[:19].sum() == 0          # slow average not formed yet
    assert up.iloc[19:].eq(1.0).all()       # steady rise: fast above slow throughout
    down = S.sma_cross(frame(np.linspace(200, 100, 120)), fast=5, slow=20)
    assert down.sum() == 0                  # steady fall: never long


def test_momentum_waits_for_a_full_lookback_and_follows_sign():
    up = S.momentum(frame(np.linspace(100, 300, 400)), lookback=100, skip=10)
    assert up.iloc[:100].sum() == 0         # no lookback, no position
    assert up.iloc[100:].eq(1.0).all()
    down = S.momentum(frame(np.linspace(300, 100, 400)), lookback=100, skip=10)
    assert down.sum() == 0


def test_rsi_reversion_buys_the_fall_and_sells_the_recovery():
    close = np.concatenate([np.linspace(100, 70, 40), np.linspace(70, 110, 60)])
    sig = S.rsi_reversion(frame(close), period=14, buy_below=30, exit_above=50)
    assert sig.iloc[15:40].sum() > 0        # persistent fall pushes RSI under 30: entered
    assert sig.iloc[-1] == 0.0              # strong recovery lifts RSI over 50: back out


def test_bollinger_never_enters_a_flat_tape_and_catches_a_dip():
    flat = S.bollinger_reversion(frame(np.full(60, 100.0)), window=20, k=2.0)
    assert flat.sum() == 0                  # zero width bands: close is never below the lower band
    close = np.full(60, 100.0)
    close[40] = 88.0                        # sharp dip well below the band
    sig = S.bollinger_reversion(frame(close), window=20, k=2.0)
    assert sig.iloc[40] == 1.0
    assert sig.iloc[-1] == 0.0              # price back at the mean: exited


def test_run_rejects_windows_under_30_days():
    df = frame(np.linspace(100, 110, 40))
    sig = pd.Series(1.0, index=df.index)
    with pytest.raises(ValueError):
        bt.run(df, sig, start=df.index[-10], end=df.index[-1])


def test_sharpe_of_constant_returns_is_zero_not_inf():
    assert bt.sharpe(np.zeros(100)) == 0.0
    assert bt.sharpe(np.full(100, 0.001)) == 0.0


def test_metrics_reports_exposure_and_win_rate():
    ret = pd.Series([0.01, -0.02, 0.03, -0.01])
    held = pd.Series([1.0, 1.0, 0.0, 0.0])
    m = bt.metrics(ret, held=held, trades=[])
    assert m["exposure"] == 0.5
    assert m["n_trades"] == 0 and m["win_rate"] is None  # no trades: None, never a fake 0%
