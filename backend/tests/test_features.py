"""The indicators.features() block is the input every future ML strategy will train on,
so its no-leakage and warm-up behaviour is pinned here directly."""
import numpy as np
import pandas as pd

from engine.indicators import features


def frame(n=120, seed=7):
    rng = np.random.default_rng(seed)
    close = 100 * np.cumprod(1 + rng.normal(0.0005, 0.012, n))
    idx = pd.bdate_range("2024-01-01", periods=n)
    return pd.DataFrame({"Close": close, "Volume": rng.integers(1e5, 1e7, n).astype(float)}, index=idx)


def test_expected_columns():
    x = features(frame())
    assert list(x.columns) == ["ret_1", "ret_5", "ret_10", "ret_20", "vol_10", "vol_20",
                               "vol_chg_5", "vol_rel_20", "rsi_14", "rsi_5", "dist_ma50"]


def test_no_lookahead():
    """Multiplying every price/volume after a cut must not change any earlier feature."""
    df = frame()
    cut = 80
    base = features(df)
    mod = df.copy()
    mod.iloc[cut:] *= 5.0
    alt = features(mod)
    pd.testing.assert_frame_equal(base.iloc[:cut - 1], alt.iloc[:cut - 1])


def test_warmup_rows_are_nan_not_zero():
    x = features(frame())
    assert x["ret_20"].iloc[:20].isna().all()      # needs 20 prior closes
    assert x["dist_ma50"].iloc[:49].isna().all()   # rolling(50) first yields a value at row 49
    assert x["rsi_14"].iloc[:14].isna().all()
    assert not x["ret_1"].iloc[20:].isna().any()   # fully formed well before the end


def test_zero_volume_never_produces_inf():
    df = frame()
    df.loc[df.index[30], "Volume"] = 0.0
    x = features(df)
    assert np.isfinite(x.dropna().to_numpy()).all()  # 0 -> NaN upstream, and inf is scrubbed
