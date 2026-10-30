"""Price-data cleaning, symbol mapping, and bootstrap short-series/reproducibility."""
import numpy as np
import pandas as pd

from engine import data
from engine.stats import bootstrap_sharpe_ci


def test_yahoo_symbol_mapping():
    assert data.yahoo_symbol("reliance") == "RELIANCE.NS"
    assert data.yahoo_symbol("TCS.NS") == "TCS.NS"
    assert data.yahoo_symbol("m&m") == "M&M.NS"
    assert data.yahoo_symbol("^nsei") == "^NSEI"
    assert data.yahoo_symbol("RELIANCE.BO") == "RELIANCE.BO"


def test_cache_filename_escapes_index_and_ampersand():
    assert data._file("^NSEI").name == "_NSEI.csv"
    assert data._file("M&M.NS") == data.CACHE / "M_AND_M.NS.csv"


def test_clean_dedupes_sorts_drops_missing_close_and_extra_columns():
    idx = ["2024-01-03", "2024-01-02", "2024-01-03", "2024-01-04"]
    df = pd.DataFrame(
        {"Open": [1, 2, 3, 4], "High": [1, 2, 3, 4], "Low": [1, 2, 3, 4],
         "Close": [1.0, None, 3.0, 4.0], "Volume": [10, 20, 30, 40],
         "Adj Close": [1, 2, 3, 4]},
        index=pd.to_datetime(idx))
    out = data._clean(df)
    assert list(out.columns) == ["Open", "High", "Low", "Close", "Volume"]
    assert out.index.is_monotonic_increasing and not out.index.duplicated().any()
    # NaN-close row gone; of the two 2024-01-03 rows the first is kept
    assert out["Close"].tolist() == [1.0, 4.0]


def test_bootstrap_none_for_short_series_and_seeded_reproducible():
    assert bootstrap_sharpe_ci([0.01] * 59) is None  # below the 60-day minimum
    r = np.random.default_rng(7).normal(0.0005, 0.012, 400)
    a = bootstrap_sharpe_ci(r, draws=200)
    b = bootstrap_sharpe_ci(r, draws=200)
    assert a == b and a[0] < a[1]


def test_load_falls_back_disk_memory_download_in_order(tmp_path, monkeypatch):
    import time
    monkeypatch.setattr(data, "CACHE", tmp_path)
    data._mem.clear()
    calls = []
    df = pd.DataFrame({"Open": [1.0], "High": [1.0], "Low": [1.0], "Close": [1.0], "Volume": [1]},
                      index=pd.to_datetime(["2024-01-02"]))
    monkeypatch.setattr(data, "download", lambda sym, start=data.START: calls.append(sym) or df)

    out, src = data.load("TCS")           # nothing cached: one live download
    assert src == "live" and calls == ["TCS.NS"]
    out, src = data.load("TCS")           # in-memory copy still fresh: no second download
    assert src == "live" and calls == ["TCS.NS"]

    data._mem.clear()
    data._mem["SBIN.NS"] = (time.time() - 7 * 3600, df)  # older than LIVE_TTL: stale
    out, src = data.load("SBIN")
    assert src == "live" and calls == ["TCS.NS", "SBIN.NS"]  # stale memory is refreshed

    data.save("TCS.NS", df)
    calls.clear(); data._mem.clear()
    out, src = data.load("TCS")           # the committed CSV wins over any live path
    assert src == "cache" and calls == []
    assert out["Close"].tolist() == [1.0]
