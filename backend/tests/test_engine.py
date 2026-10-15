import numpy as np
import pandas as pd
import pytest

from engine import backtest as bt
from engine import strategies as S
from engine.stats import bootstrap_sharpe_ci


def synth(n=900, seed=1, drift=0.0004):
    rng = np.random.default_rng(seed)
    r = rng.normal(drift, 0.015, n)
    close = 100 * np.cumprod(1 + r)
    openp = close / (1 + r) * (1 + rng.normal(0, 0.003, n))
    idx = pd.bdate_range("2018-01-01", periods=n)
    return pd.DataFrame({"Open": openp, "High": close * 1.01, "Low": close * 0.99, "Close": close,
                         "Volume": 1e6}, index=idx)


ALL = [k for k in S.STRATEGIES]


@pytest.mark.parametrize("sid", ALL)
def test_no_lookahead(sid):
    """Changing the future must not change any earlier position."""
    df = synth()
    cut = 600
    base = S.positions(sid, df)
    mod = df.copy()
    mod.iloc[cut:, mod.columns.get_indexer(["Open", "High", "Low", "Close"])] *= 3.7
    alt = S.positions(sid, mod)
    pd.testing.assert_series_equal(base.iloc[:cut], alt.iloc[:cut])


@pytest.mark.parametrize("sid", ALL)
def test_positions_are_binary(sid):
    p = S.positions(sid, synth())
    assert set(p.unique()) <= {0.0, 1.0}


@pytest.mark.parametrize("sid", ALL)
def test_costs_reduce_return(sid):
    df = synth()
    sig = S.positions(sid, df)
    _, r0, _, _ = bt.run(df, sig, cost_bps=0)
    _, r1, _, tr = bt.run(df, sig, cost_bps=50)
    assert bt.equity(r1).iloc[-1] <= bt.equity(r0).iloc[-1] + 1e-12
    if sid != "buy_hold" and len(tr) > 0:
        assert bt.equity(r1).iloc[-1] < bt.equity(r0).iloc[-1]


def test_cost_is_exact_for_buy_hold():
    df = synth()
    sig = pd.Series(1.0, index=df.index)
    ret, held, turn = bt.strategy_returns(df, sig, cost_bps=10)
    assert turn.sum() == 1.0                      # one entry, no exit
    ret0, _, _ = bt.strategy_returns(df, sig, cost_bps=0)
    assert ret.iloc[1] == pytest.approx(ret0.iloc[1] - 0.001)
    assert (ret.iloc[2:] - ret0.iloc[2:]).abs().max() < 1e-15


def test_trade_fills_next_open():
    df = synth(200)
    sig = pd.Series(0.0, index=df.index)
    sig.iloc[50:80] = 1.0                          # long from the close of day 50; first flat signal at the close of day 80
    win, ret, held, trades = bt.run(df, sig, cost_bps=0)
    assert len(trades) == 1
    t = trades[0]
    assert t["entry_date"] == df.index[51].strftime("%Y-%m-%d")
    assert t["entry_price"] == round(df.Open.iloc[51], 2)
    assert t["exit_date"] == df.index[81].strftime("%Y-%m-%d")
    # equity must match trade return when cost is zero
    assert bt.equity(ret).iloc[-1] - 1 == pytest.approx(t["return"], abs=1e-4)


def test_flat_signal_zero_return():
    df = synth()
    _, ret, held, trades = bt.run(df, pd.Series(0.0, index=df.index))
    assert ret.abs().sum() == 0 and trades == []


def test_buy_hold_matches_price_ratio():
    df = synth()
    _, ret, _, _ = bt.run(df, pd.Series(1.0, index=df.index), cost_bps=0)
    # first day flat by construction, enter at the open of day 2, then close-to-close
    assert bt.equity(ret).iloc[-1] == pytest.approx(df.Close.iloc[-1] / df.Open.iloc[1], rel=1e-9)


def test_drawdown_and_metrics():
    ret = pd.Series([0.1, -0.1, 0.05, -0.2, 0.3])
    eq = bt.equity(ret)
    assert bt.drawdown(eq).min() == pytest.approx(1.1 * 0.9 * 1.05 * 0.8 / 1.1 - 1)
    m = bt.metrics(ret)
    assert m["max_drawdown"] <= 0


def test_param_validation():
    with pytest.raises(ValueError):
        S.clean_params("sma_cross", {"fast": 60, "slow": 30})
    assert S.clean_params("sma_cross", {"fast": 5, "slow": 9999})["slow"] == 300


def test_bootstrap_ci_brackets_point():
    r = np.random.default_rng(0).normal(0.0006, 0.01, 1500)
    lo, hi = bootstrap_sharpe_ci(r)
    assert lo < hi
