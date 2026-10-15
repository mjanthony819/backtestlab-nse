"""Download the cached universe from Yahoo Finance. Run nightly by .github/workflows/update-data.yml."""
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from engine import data  # noqa: E402

man = {}
for t in [data.BENCH] + [data.yahoo_symbol(s) for s in data.NIFTY]:
    ok = False
    for attempt in range(3):
        try:
            df = data.download(t)
            data.save(t, df)
            man[t] = {"start": df.index[0].strftime("%Y-%m-%d"), "end": df.index[-1].strftime("%Y-%m-%d"), "rows": len(df)}
            ok = True
            break
        except Exception as e:  # noqa: BLE001
            print("retry", t, e)
            time.sleep(2)
    print("ok" if ok else "FAILED", t)
old = data.manifest()
for t, v in old.items():  # keep the previous entry if a ticker failed today
    man.setdefault(t, v)
man["_updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
(data.CACHE / "manifest.json").write_text(json.dumps(man, indent=1, sort_keys=True))
