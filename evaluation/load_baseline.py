import json
from pathlib import Path

def load_baseline():
    path = Path("baselines/baseline.json")
    if not path.exists():
        return None

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
