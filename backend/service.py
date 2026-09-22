import json
import threading
import uuid
from datetime import datetime
from pathlib import Path

from config import CONFIG
from rag.pipeline import RAGPipeline
from evaluation.regression import check_regression


BASELINE_PATH = Path("baselines/baseline.json")
RUNS_DIR = Path("runs")

ACTIVE_RUNS = {}
RUN_LOCK = threading.Lock()


def load_questions():
    with open(
        CONFIG["paths"]["questions_file"],
        "r",
        encoding="utf-8"
    ) as f:
        return json.load(f)


def load_baseline():
    if not BASELINE_PATH.exists():
        return None

    with open(
        BASELINE_PATH,
        "r",
        encoding="utf-8"
    ) as f:
        return json.load(f)


def save_run(run_id, results, metadata, gate):
    RUNS_DIR.mkdir(exist_ok=True)

    path = RUNS_DIR / f"{run_id}.json"

    payload = {
        "metadata": metadata,
        "results": results,
        "gate": gate,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    return str(path)


def save_baseline(results, metadata):
    BASELINE_PATH.parent.mkdir(exist_ok=True)

    payload = {
        "metadata": metadata,
        "results": results,
    }

    with open(BASELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def validate_dataset(baseline_results, current_results):
    baseline_questions = {
        item["question"]
        for item in baseline_results
        if "question" in item
    }

    current_questions = {
        item["question"]
        for item in current_results
        if "question" in item
    }

    missing_from_current = baseline_questions - current_questions
    new_in_current = current_questions - baseline_questions

    if missing_from_current or new_in_current:
        return False, {
            "missing_from_current": sorted(missing_from_current),
            "new_in_current": sorted(new_in_current),
        }

    return True, {}


def execute_run(run_id):
    """
    Execute one complete 28-question candidate evaluation.
    """

    try:
        ACTIVE_RUNS[run_id]["status"] = "running"

        questions = load_questions()

        ACTIVE_RUNS[run_id]["total_questions"] = len(questions)
        ACTIVE_RUNS[run_id]["completed_questions"] = 0
        ACTIVE_RUNS[run_id]["progress"] = 0

        pipeline = RAGPipeline()

        results = []

        for index, question_data in enumerate(questions, start=1):

            question = question_data["question"]

            print(
                f"\n[{index}/{len(questions)}] "
                f"Evaluating: {question}"
            )

            result = pipeline.run(question)

            results.append({
                "question": result["question"],
                "answer": result["answer"],
                "claims": result["claims"],
                "claim_extraction_failed": result[
                    "claim_extraction_failed"
                ],
                "faithfulness": result[
                    "faithfulness_score"
                ],
                "faithfulness_details": result[
                    "faithfulness_details"
                ],
                "coverage": result[
                    "coverage_score"
                ],
                "coverage_details": result[
                    "coverage_details"
                ],
                "final_score": result[
                    "final_score"
                ],
            })

            ACTIVE_RUNS[run_id]["completed_questions"] = index

            ACTIVE_RUNS[run_id]["progress"] = int(
                (index / len(questions)) * 100
            )

        # --------------------------------------------------
        # REGRESSION GATE
        # --------------------------------------------------

        baseline = load_baseline()

        if baseline is None:

            gate = {
                "status": "blocked",
                "reason": "No baseline found",
                "failures": [],
                "warnings": [],
            }

        else:

            compatible, differences = validate_dataset(
                baseline["results"],
                results
            )

            if not compatible:

                gate = {
                    "status": "blocked",
                    "reason": "Baseline dataset mismatch",
                    "failures": [],
                    "warnings": [],
                    "dataset_differences": differences,
                }

            else:

                failures, warnings = check_regression(
                    baseline["results"],
                    results
                )

                if failures:
                    gate_status = "blocked"

                elif warnings:
                    gate_status = "approved_with_warnings"

                else:
                    gate_status = "approved"

                gate = {
                    "status": gate_status,
                    "reason": (
                        "Regression failures detected"
                        if failures
                        else (
                            "Warnings detected"
                            if warnings
                            else "No regressions detected"
                        )
                    ),
                    "failures": failures,
                    "warnings": warnings,
                }

        # --------------------------------------------------
        # SAVE RUN
        # --------------------------------------------------

        metadata = {
            "created_at": datetime.now().isoformat(),
            "answer_model": CONFIG["llm"]["answer_model"],
            "eval_model": CONFIG["llm"]["eval_model"],
            "question_count": len(results),
            "mode": "candidate",
        }

        run_path = save_run(
            run_id,
            results,
            metadata,
            gate
        )

        ACTIVE_RUNS[run_id]["status"] = gate["status"]

        ACTIVE_RUNS[run_id]["result"] = {
            "run_id": run_id,
            "results": results,
            "gate": gate,
            "metadata": metadata,
            "path": run_path,
        }

        # --------------------------------------------------
        # BASELINE PROMOTION
        # --------------------------------------------------

        if gate["status"] in {
            "approved",
            "approved_with_warnings",
        }:

            save_baseline(
                results,
                {
                    "promoted_at": datetime.now().isoformat(),
                    "source_run": run_path,
                    "answer_model": CONFIG["llm"]["answer_model"],
                    "eval_model": CONFIG["llm"]["eval_model"],
                    "question_count": len(results),
                }
            )

            ACTIVE_RUNS[run_id]["promoted"] = True

        else:

            ACTIVE_RUNS[run_id]["promoted"] = False

        ACTIVE_RUNS[run_id]["progress"] = 100

    except Exception as e:

        print(f"\n❌ Run {run_id} failed:")
        print(e)

        ACTIVE_RUNS[run_id]["status"] = "failed"
        ACTIVE_RUNS[run_id]["error"] = str(e)

    finally:

        RUN_LOCK.release()


def create_run(background_tasks):
    """
    Create a complete candidate evaluation run.
    """

    if not RUN_LOCK.acquire(blocking=False):
        return None

    run_id = (
        f"run_"
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_"
        f"{uuid.uuid4().hex[:6]}"
    )

    ACTIVE_RUNS[run_id] = {
        "run_id": run_id,
        "status": "queued",
        "progress": 0,
        "total_questions": 0,
        "completed_questions": 0,
        "error": None,
        "promoted": False,
    }

    background_tasks.add_task(
        execute_run,
        run_id
    )

    return run_id


def get_run(run_id):
    return ACTIVE_RUNS.get(run_id)