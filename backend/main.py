import os

from fastapi import (
    BackgroundTasks,
    FastAPI,
    HTTPException,
    Query
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


app = FastAPI(
    title="Regression-Safe RAG Guardrails API",
    version="1.0.0",
)


FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "rag-guardrails-api",
    }


@app.post("/runs", response_model=RunResponse)
def start_run(background_tasks: BackgroundTasks):

    run_id = create_run(background_tasks)

    if run_id is None:
        raise HTTPException(
            status_code=409,
            detail="An evaluation is already running."
        )

    return {
        "run_id": run_id,
        "status": "queued",
    }

@app.get("/runs/{run_id}", response_model=RunStatus)
def run_status(run_id: str):

    run = get_run(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Run not found."
        )

    return {
        "run_id": run["run_id"],
        "status": run["status"],
        "progress": run["progress"],
        "total_questions": run["total_questions"],
        "completed_questions": run["completed_questions"],
        "error": run["error"],
    }


@app.get("/runs/{run_id}/result")
def run_result(run_id: str):

    run = get_run(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Run not found."
        )

    if "result" not in run:
        return {
            "run_id": run_id,
            "status": run["status"],
            "message": "Evaluation is not complete yet."
        }

    return run["result"]