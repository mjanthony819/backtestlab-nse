import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_tickers_and_strategies():
    t = client.get("/tickers").json()
    assert len(t["tickers"]) >= 40
    s = client.get("/strategies").json()["strategies"]
    assert {x["id"] for x in s} == {"buy_hold", "sma_cross", "rsi_reversion", "momentum", "bollinger"}


@pytest.mark.parametrize("sid", ["buy_hold", "sma_cross", "rsi_reversion", "momentum", "bollinger"])
def test_backtest_cached_ticker(sid):
    r = client.post("/backtest", json={"ticker": "RELIANCE", "strategy": sid, "start": "2016-01-01", "cost_bps": 10})
    assert r.status_code == 200, r.text
    j = r.json()
    n = len(j["dates"])
    assert n > 2000 and len(j["equity"]) == len(j["drawdown"]) == len(j["buy_hold_equity"]) == n
    assert j["data_source"] == "cache" and j["benchmark_equity"] and len(j["benchmark_equity"]) == n
    assert j["metrics"]["max_drawdown"] <= 0


def test_bad_inputs():
    assert client.post("/backtest", json={"ticker": "TCS", "strategy": "nope"}).status_code == 400
    assert client.post("/backtest", json={"ticker": "TCS", "strategy": "sma_cross",
                                          "params": {"fast": 80, "slow": 40}}).status_code == 400
    assert client.post("/backtest", json={"ticker": "TCS", "strategy": "buy_hold",
                                          "start": "2026-10-01", "end": "2026-10-10"}).status_code == 400
