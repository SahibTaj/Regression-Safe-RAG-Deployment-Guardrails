import json
from datetime import datetime

def save_run(results):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = f"runs/run_{ts}.json"

    with open(path, "w") as f:
        json.dump(results, f, indent=2)

    return path
import json
from datetime import datetime
from pathlib import Path

def save_run(results, metadata=None):
    Path("runs").mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_path = f"runs/run_{timestamp}.json"

    payload = {
        "metadata": metadata or {},
        "results": results
    }

    with open(run_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    return run_path
