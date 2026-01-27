import json
from pathlib import Path

def save_baseline(results, metadata=None):
    Path("baselines").mkdir(exist_ok=True)

    payload = {
        "metadata": metadata or {},
        "results": results
    }

    with open("baselines/baseline.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
