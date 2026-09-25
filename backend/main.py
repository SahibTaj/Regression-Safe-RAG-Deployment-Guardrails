import json
import os
from pathlib import Path

from fastapi import (
    BackgroundTasks,
    FastAPI,
    HTTPException,
)

from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import (
    RunResponse,
    RunStatus,
)

from backend.service import (
    create_run,
    get_run,
)


RUNS_DIR = Path("runs")
BASELINE_PATH = Path("baselines/baseline.json")


app = FastAPI(
    title="Regression-Safe RAG Guardrails API",
    version="1.0.0",
)


FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Helper functions
# ============================================================

def load_saved_run(run_id: str):
    """
    Load a completed run from the runs directory.

    This allows historical runs to remain available even
    after the FastAPI server restarts.
    """

    run_path = RUNS_DIR / f"{run_id}.json"

    if not run_path.exists():
        return None

    try:
        with open(run_path, "r", encoding="utf-8") as file:
            payload = json.load(file)

        gate = payload.get("gate", {})
        metadata = payload.get("metadata", {})
        results = payload.get("results", [])

        return {
            "run_id": run_id,
            "status": gate.get("status", "unknown"),
            "progress": 100,
            "total_questions": len(results),
            "completed_questions": len(results),
            "error": None,
            "promoted": gate.get("status") in {
                "approved",
                "approved_with_warnings",
            },
            "result": {
                "run_id": run_id,
                "results": results,
                "gate": gate,
                "metadata": metadata,
                "path": str(run_path),
            },
        }

    except Exception as error:
        print(f"Could not load saved run {run_id}: {error}")
        return None


def get_run_from_memory_or_disk(run_id: str):
    """
    First check active in-memory runs.
    If unavailable, load the run from disk.
    """

    active_run = get_run(run_id)

    if active_run is not None:
        return active_run

    return load_saved_run(run_id)


def calculate_average(results, field: str):
    """
    Calculate the average of a numeric result field.
    """

    values = []

    for result in results:
        value = result.get(field)

        if isinstance(value, (int, float)):
            values.append(float(value))

    if not values:
        return 0.0

    return round(sum(values) / len(values), 4)


def create_run_summary(run_id: str, payload: dict):
    """
    Convert a saved run into a frontend-friendly summary.
    """

    results = payload.get("results", [])
    gate = payload.get("gate", {})
    metadata = payload.get("metadata", {})

    return {
        "run_id": run_id,
        "status": gate.get("status", "unknown"),
        "created_at": metadata.get("created_at"),
        "question_count": len(results),
        "model": metadata.get("answer_model"),
        "faithfulness": calculate_average(
            results,
            "faithfulness",
        ),
        "coverage": calculate_average(
            results,
            "coverage",
        ),
        "final_score": calculate_average(
            results,
            "final_score",
        ),
        "gate": gate,
        "metadata": metadata,
    }


# ============================================================
# Health
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "rag-guardrails-api",
    }


# ============================================================
# Start evaluation
# ============================================================

@app.post("/runs", response_model=RunResponse)
def start_run(background_tasks: BackgroundTasks):

    run_id = create_run(background_tasks)

    if run_id is None:
        raise HTTPException(
            status_code=409,
            detail="An evaluation is already running.",
        )

    return {
        "run_id": run_id,
        "status": "queued",
    }


# ============================================================
# List saved evaluation runs
# ============================================================

@app.get("/runs")
def list_runs():

    RUNS_DIR.mkdir(exist_ok=True)

    runs = []

    for run_path in RUNS_DIR.glob("*.json"):

        try:
            with open(
                run_path,
                "r",
                encoding="utf-8",
            ) as file:
                payload = json.load(file)

            run_id = run_path.stem

            runs.append(
                create_run_summary(
                    run_id,
                    payload,
                )
            )

        except Exception as error:
            print(
                f"Skipping invalid run file "
                f"{run_path}: {error}"
            )

    runs.sort(
        key=lambda item: item.get("created_at") or "",
        reverse=True,
    )

    return {
        "runs": runs,
        "total": len(runs),
    }


# ============================================================
# Run status
# ============================================================

@app.get("/runs/{run_id}", response_model=RunStatus)
def run_status(run_id: str):

    run = get_run_from_memory_or_disk(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Run not found.",
        )

    return {
        "run_id": run["run_id"],
        "status": run["status"],
        "progress": run.get("progress", 100),
        "total_questions": run.get(
            "total_questions",
            0,
        ),
        "completed_questions": run.get(
            "completed_questions",
            0,
        ),
        "error": run.get("error"),
    }


# ============================================================
# Run result
# ============================================================

@app.get("/runs/{run_id}/result")
def run_result(run_id: str):

    run = get_run_from_memory_or_disk(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Run not found.",
        )

    if "result" not in run:
        return {
            "run_id": run_id,
            "status": run.get("status", "unknown"),
            "message": "Evaluation is not complete yet.",
        }

    return run["result"]


# ============================================================
# Baseline
# ============================================================

@app.get("/baseline")
def get_baseline():

    if not BASELINE_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Baseline not found.",
        )

    try:
        with open(
            BASELINE_PATH,
            "r",
            encoding="utf-8",
        ) as file:
            baseline = json.load(file)

        return baseline

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load baseline: {error}",
        )