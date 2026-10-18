"""Round-trip trade extraction and strategy parameter clamping."""
import numpy as np
import pandas as pd

from engine import backtest as bt
from engine import strategies as S


def frame(opens, closes=None):
    closes = list(closes) if closes is not None else list(opens)
    idx = pd.bdate_range("2026-01-05", periods=len(opens))
    return pd.DataFrame(
        {"Open": opens, "Close": closes,
         "High": np.maximum(opens, closes), "Low": np.minimum(opens, closes),
         "Volume": 1000},
        index=idx,
    )


def test_extract_trades_multiple_round_trips():
    df = frame([100, 100, 110, 110, 120, 120, 130])
    held = pd.Series([0, 1, 1, 0, 0, 1, 0], index=df.index, dtype=float)
    trades = bt.extract_trades(df, held, cost_bps=10.0)
    assert len(trades) == 2
    # entry at the open of the first held day, exit at the open of the first flat day
    assert trades[0]["entry_date"] == df.index[1].strftime("%Y-%m-%d")
    assert trades[0]["exit_date"] == df.index[3].strftime("%Y-%m-%d")
    assert trades[1]["entry_date"] == df.index[5].strftime("%Y-%m-%d")
    assert trades[1]["exit_date"] == df.index[6].strftime("%Y-%m-%d")
    assert not any(t["open"] for t in trades)
    # second trade: filled at 120, out at 130, cost charged on both sides
    assert trades[1]["return"] == 130 / 120 * (1 - 1e-3) / (1 + 1e-3) - 1


def test_open_trade_is_marked_and_costed_one_side():
    df = frame([100, 100, 110], closes=[100, 105, 120])
    held = pd.Series([0, 1, 1], index=df.index, dtype=float)
    (t,) = bt.extract_trades(df, held, cost_bps=10.0)
    assert t["open"] is True
    assert t["exit_date"] == df.index[-1].strftime("%Y-%m-%d")
    assert t["exit_price"] == 120.0  # still-held position is marked at the last close
    assert t["return"] == 120 / 100 * (1 - 1e-3) - 1  # only the entry side is costed


def test_flat_position_makes_no_trades():
    df = frame([100, 101, 102])
    held = pd.Series([0, 0, 0], index=df.index, dtype=float)
    assert bt.extract_trades(df, held, cost_bps=10.0) == []


def test_clean_params_clamps_to_declared_ranges():
    p = S.clean_params("rsi_reversion", {"period": 999, "buy_below": 1})
    assert p["period"] == 30 and p["buy_below"] == 5
    p = S.clean_params("bollinger", {"k": 99})
    assert p["k"] == 4.0 and isinstance(p["k"], float)  # float step keeps a float
    p = S.clean_params("sma_cross", {"fast": 10.7})
    assert p["fast"] == 10 and isinstance(p["fast"], int)  # integer step floors to int


def test_clean_params_defaults_when_nothing_given():
    assert S.clean_params("momentum", None) == {"lookback": 252, "skip": 21}
