"""Donchian breakout strategy: entry/exit behaviour and channel hygiene."""
import numpy as np
import pandas as pd

from engine import strategies as S


def frame(close):
    close = np.asarray(close, dtype=float)
    idx = pd.bdate_range("2024-01-01", periods=len(close))
    return pd.DataFrame({"Open": close, "High": close, "Low": close, "Close": close,
                         "Volume": 1e6}, index=idx)


def test_donchian_enters_on_breakout_and_exits_on_breakdown():
    close = np.full(100, 100.0)
    close[60:80] = 110.0   # breakout above the prior 55-day high
    close[80:] = 105.0     # breakdown below the prior 20-day low
    sig = S.donchian(frame(close), entry=55, exit=20)
    assert sig.iloc[:60].sum() == 0
    assert sig.iloc[60:80].eq(1.0).all()
    assert sig.iloc[80:].sum() == 0


def test_donchian_channel_excludes_the_current_day():
    # One huge spike: if today's High fed its own channel, the breakout could never trigger.
    close = np.full(60, 100.0)
    close[-1] = 500.0
    sig = S.donchian(frame(close), entry=55, exit=20)
    assert sig.iloc[-1] == 1.0


def test_donchian_flat_when_price_stays_inside_the_channel():
    t = np.arange(400)
    close = 100 + 5 * np.sin(t / 8) * np.exp(-t / 200)  # every peak lower than the last: never a new 55-day high
    sig = S.donchian(frame(close), entry=55, exit=20)
    assert sig.sum() == 0


def test_donchian_is_registered_and_schema_valid():
    ids = [s["id"] for s in S.schema()]
    assert "donchian" in ids
    params = S.clean_params("donchian", {"entry": 999, "exit": 1})
    assert params == {"entry": 200, "exit": 5}  # clamped to the declared ranges
