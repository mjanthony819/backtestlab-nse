"""Plain pandas indicators. Every value at row t uses data up to and including t only."""
import numpy as np
import pandas as pd


def sma(close: pd.Series, n: int) -> pd.Series:
    return close.rolling(n).mean()


def rsi(close: pd.Series, n: int = 14) -> pd.Series:
    """Simple-average RSI, same definition as the research repo."""
    delta = close.diff()
    up = delta.clip(lower=0).rolling(n).mean()
    down = (-delta.clip(upper=0)).rolling(n).mean()
    return 100 - 100 / (1 + up / down)


def bollinger(close: pd.Series, n: int = 20, k: float = 2.0):
    mid = close.rolling(n).mean()
    sd = close.rolling(n).std()
    return mid - k * sd, mid, mid + k * sd


def features(df: pd.DataFrame) -> pd.DataFrame:
    """Feature block from the research repo, kept for the later ML showcase strategy."""
    close, volume = df.Close, df.Volume.replace(0, np.nan)
    ret = close.pct_change(fill_method=None)
    x = pd.DataFrame(index=df.index)
    for n in (1, 5, 10, 20):
        x[f"ret_{n}"] = close.pct_change(n, fill_method=None)
    x["vol_10"] = ret.rolling(10).std()
    x["vol_20"] = ret.rolling(20).std()
    x["vol_chg_5"] = volume.pct_change(5, fill_method=None)
    x["vol_rel_20"] = volume / volume.rolling(20).mean()
    x["rsi_14"], x["rsi_5"] = rsi(close, 14), rsi(close, 5)
    x["dist_ma50"] = close / close.rolling(50).mean() - 1
    return x.replace([np.inf, -np.inf], np.nan)
