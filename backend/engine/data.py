"""Price data. Reads the committed CSV cache first; unknown tickers fall back to a
live Yahoo Finance call (unofficial, can rate-limit) that is cached in memory/disk."""
import json
import os
import time
from pathlib import Path

import pandas as pd

CACHE = Path(os.environ.get("BT_CACHE_DIR", Path(__file__).resolve().parents[1] / "data" / "cache"))
BENCH = "^NSEI"
START = "2012-01-01"
LIVE_TTL = 6 * 3600
_mem: dict[str, tuple[float, pd.DataFrame]] = {}

NIFTY = {
    "RELIANCE": "Reliance Industries", "TCS": "Tata Consultancy Services", "HDFCBANK": "HDFC Bank",
    "INFY": "Infosys", "ICICIBANK": "ICICI Bank", "HINDUNILVR": "Hindustan Unilever", "ITC": "ITC",
    "SBIN": "State Bank of India", "BHARTIARTL": "Bharti Airtel", "KOTAKBANK": "Kotak Mahindra Bank",
    "LT": "Larsen & Toubro", "AXISBANK": "Axis Bank", "ASIANPAINT": "Asian Paints", "MARUTI": "Maruti Suzuki",
    "SUNPHARMA": "Sun Pharma", "TITAN": "Titan", "BAJFINANCE": "Bajaj Finance", "NESTLEIND": "Nestle India",
    "ULTRACEMCO": "UltraTech Cement", "WIPRO": "Wipro", "HCLTECH": "HCL Technologies", "NTPC": "NTPC",
    "POWERGRID": "Power Grid", "ONGC": "ONGC", "TATASTEEL": "Tata Steel", "M&M": "Mahindra & Mahindra",
    "TECHM": "Tech Mahindra", "JSWSTEEL": "JSW Steel", "ADANIPORTS": "Adani Ports", "COALINDIA": "Coal India",
    "BAJAJFINSV": "Bajaj Finserv", "DRREDDY": "Dr Reddy's", "CIPLA": "Cipla", "EICHERMOT": "Eicher Motors",
    "GRASIM": "Grasim", "HEROMOTOCO": "Hero MotoCorp", "BRITANNIA": "Britannia", "DIVISLAB": "Divi's Labs",
    "HINDALCO": "Hindalco", "BPCL": "BPCL", "INDUSINDBK": "IndusInd Bank", "APOLLOHOSP": "Apollo Hospitals",
    "TATACONSUM": "Tata Consumer", "SBILIFE": "SBI Life", "HDFCLIFE": "HDFC Life", "BAJAJ-AUTO": "Bajaj Auto",
    "ADANIENT": "Adani Enterprises", "SHREECEM": "Shree Cement",
    "PIDILITIND": "Pidilite", "DABUR": "Dabur",
}


def yahoo_symbol(t: str) -> str:
    t = t.strip().upper()
    if t.startswith("^") or t.endswith(".NS") or t.endswith(".BO"):
        return t
    return t + ".NS"


def _file(sym: str) -> Path:
    return CACHE / (sym.replace("^", "_").replace("&", "_AND_") + ".csv")


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.index = pd.to_datetime(df.index).tz_localize(None)
    df.index.name = "Date"
    df = df[["Open", "High", "Low", "Close", "Volume"]].dropna(subset=["Close"]).sort_index()
    return df[~df.index.duplicated()]


def download(sym: str, start: str = START) -> pd.DataFrame:
    import yfinance as yf
    df = yf.download(sym, start=start, progress=False, auto_adjust=True)
    if df is None or df.empty:
        raise ValueError(f"No Yahoo data for {sym}")
    df.columns = df.columns.get_level_values(0)
    return _clean(df)


def save(sym: str, df: pd.DataFrame):
    CACHE.mkdir(parents=True, exist_ok=True)
    df.round({"Open": 2, "High": 2, "Low": 2, "Close": 2}).to_csv(_file(sym))


def load(ticker: str) -> tuple[pd.DataFrame, str]:
    """Return (prices, source) where source is 'cache' or 'live'."""
    sym = yahoo_symbol(ticker)
    f = _file(sym)
    if f.exists():
        return _clean(pd.read_csv(f, index_col=0, parse_dates=True)), "cache"
    hit = _mem.get(sym)
    if hit and time.time() - hit[0] < LIVE_TTL:
        return hit[1], "live"
    df = download(sym)
    _mem[sym] = (time.time(), df)
    return df, "live"


def manifest() -> dict:
    p = CACHE / "manifest.json"
    return json.loads(p.read_text()) if p.exists() else {}
