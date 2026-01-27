from rag.pipeline import RAGPipeline
from config import CONFIG

import json
from datetime import datetime
from pathlib import Path
import sys

from evaluation.regression import check_regression


# --------------------------------------------------
# Utilities
# --------------------------------------------------

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


def save_baseline(results, metadata=None):
    Path("baselines").mkdir(exist_ok=True)

    payload = {
        "metadata": metadata or {},
        "results": results
    }

    with open("baselines/baseline.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def load_baseline():
    path = Path("baselines/baseline.json")
    if not path.exists():
        return None

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------
# Main execution
# --------------------------------------------------

def main():
    pipeline = RAGPipeline()

    questions = json.load(open(CONFIG["paths"]["questions_file"], encoding="utf-8"))

    all_results = []

    print("\n=== RUNNING EVALUATION ===\n")

    for q in questions:
        result = pipeline.run(q["question"])

        # -------------------------
        # Console output (debug)
        # -------------------------
        print("\nQ:", result["question"])
        print("A:", result["answer"])

        print("Faithfulness Score:", result["faithfulness_score"])
        print("Coverage Score:", result["coverage_score"])
        print("Final Score:", result["final_score"])

        print("Claim extraction failed:", result["claim_extraction_failed"])
        print("Claims:") 
        if not result["claims"]: 
            print("(no claims)") 
        else: 
            for c in result["claims"]: 
                print("-", c["text"]) 
        print("Coverage Details:", result["coverage_details"])
        # -------------------------
        # Collect structured result
        # -------------------------
        all_results.append({
            "question": q["question"],
            "faithfulness": result["faithfulness_score"],
            "coverage": result["coverage_score"],
            "coverage_details": result["coverage_details"],
            "final_score": result["final_score"]
        })

    # --------------------------------------------------
    # Save candidate run
    # --------------------------------------------------
    run_path = save_run(
        all_results,
        metadata={
            "answer_model": CONFIG["llm"]["answer_model"],
            "eval_model": CONFIG["llm"]["eval_model"],
            "timestamp": datetime.now().isoformat()
        }
    )

    print("\nCandidate run saved to:", run_path)

    # --------------------------------------------------
    # Load baseline
    # --------------------------------------------------
    baseline = load_baseline()

    # FIRST RUN → CREATE BASELINE
    if baseline is None:
        print("\nNo baseline found.")
        print("Promoting first run as baseline.")

        save_baseline(
            all_results,
            metadata={
                "created_at": datetime.now().isoformat(),
                "source_run": run_path
            }
        )

        print("Baseline created successfully.")
        sys.exit(0)

    # --------------------------------------------------
    # Regression check
    # --------------------------------------------------
    failures, warnings = check_regression(
        baseline["results"],
        all_results
    )

    if failures:
        print("\n❌ DEPLOYMENT BLOCKED")
        for f in failures:
            print(" -", f)

        print("\nCandidate run rejected.")
        sys.exit(1)

    if warnings:
        print("\n⚠️ WARNINGS:")
        for w in warnings:
            print(" -", w)

    # --------------------------------------------------
    # Promote candidate to baseline
    # --------------------------------------------------
    save_baseline(
        all_results,
        metadata={
            "promoted_at": datetime.now().isoformat(),
            "source_run": run_path
        }
    )

    print("\n✅ Candidate promoted to new baseline")
    print("Deployment approved.")


# --------------------------------------------------
# Entry point
# --------------------------------------------------

if __name__ == "__main__":
    main()
