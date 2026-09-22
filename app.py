from rag.pipeline import RAGPipeline
from config import CONFIG

import json
from datetime import datetime
from pathlib import Path
import sys

from evaluation.regression import check_regression


# --------------------------------------------------
# Configuration
# --------------------------------------------------

BASELINE_PATH = Path("baselines/baseline.json")
RUNS_DIR = Path("runs")


# --------------------------------------------------
# Utilities
# --------------------------------------------------

def save_run(results, metadata=None):
    RUNS_DIR.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_path = RUNS_DIR / f"run_{timestamp}.json"

    payload = {
        "metadata": metadata or {},
        "results": results
    }

    with open(run_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    return str(run_path)


def save_baseline(results, metadata=None):
    BASELINE_PATH.parent.mkdir(exist_ok=True)

    payload = {
        "metadata": metadata or {},
        "results": results
    }

    with open(BASELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def load_baseline():
    if not BASELINE_PATH.exists():
        return None

    with open(BASELINE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_questions():
    with open(
        CONFIG["paths"]["questions_file"],
        "r",
        encoding="utf-8"
    ) as f:
        return json.load(f)


# --------------------------------------------------
# Validation
# --------------------------------------------------

def validate_dataset(baseline, current):
    """
    Ensure baseline and candidate contain the same questions.

    A regression comparison should not happen when the test
    datasets are different.
    """

    baseline_questions = {
        item["question"]
        for item in baseline
        if "question" in item
    }

    current_questions = {
        item["question"]
        for item in current
        if "question" in item
    }

    missing_from_current = baseline_questions - current_questions
    new_in_current = current_questions - baseline_questions

    if missing_from_current or new_in_current:
        return False, {
            "missing_from_current": sorted(missing_from_current),
            "new_in_current": sorted(new_in_current)
        }

    return True, {}


# --------------------------------------------------
# Evaluation
# --------------------------------------------------

def run_evaluation(questions):
    pipeline = RAGPipeline()

    all_results = []

    print("\n=== RUNNING EVALUATION ===\n")

    for index, q in enumerate(questions, start=1):

        print(f"\n{'=' * 60}")
        print(f"QUESTION {index}/{len(questions)}")
        print(f"{'=' * 60}")

        result = pipeline.run(q["question"])

        # --------------------------------------------------
        # Console output
        # --------------------------------------------------

        print("\nQ:", result["question"])
        print("A:", result["answer"])

        print(
            "Faithfulness Score:",
            result["faithfulness_score"]
        )

        print(
            "Coverage Score:",
            result["coverage_score"]
        )

        print(
            "Final Score:",
            result["final_score"]
        )

        print(
            "Claim extraction failed:",
            result["claim_extraction_failed"]
        )

        print("\nClaims:")

        if not result["claims"]:
            print("(no claims)")
        else:
            for claim in result["claims"]:
                print("-", claim["text"])

        print(
            "\nCoverage Details:",
            result["coverage_details"]
        )

        # --------------------------------------------------
        # Structured result
        # --------------------------------------------------

        all_results.append({
            "question": q["question"],
            "faithfulness": result["faithfulness_score"],
            "coverage": result["coverage_score"],
            "coverage_details": result["coverage_details"],
            "final_score": result["final_score"]
        })

    return all_results


# --------------------------------------------------
# Main
# --------------------------------------------------

def main():

    # --------------------------------------------------
    # Command-line modes
    # --------------------------------------------------

    smoke_test = "--smoke" in sys.argv
    set_baseline = "--set-baseline" in sys.argv

    # --------------------------------------------------
    # Load questions
    # --------------------------------------------------

    questions = load_questions()

    if smoke_test:
        # Only evaluate first question.
        questions = questions[:1]

        print("\n⚠️ SMOKE TEST MODE")
        print("Only the first question will be evaluated.")
        print("This run CANNOT become the baseline.\n")

    elif set_baseline:
        print("\n⚠️ BASELINE CREATION MODE")
        print(f"Evaluating {len(questions)} questions.")
        print("This run will become the new baseline only after completion.\n")

    else:
        print(
            f"\nCandidate evaluation: {len(questions)} questions.\n"
        )

    # --------------------------------------------------
    # Run evaluation
    # --------------------------------------------------

    all_results = run_evaluation(questions)

    # --------------------------------------------------
    # Save candidate run
    # --------------------------------------------------

    run_path = save_run(
        all_results,
        metadata={
            "answer_model": CONFIG["llm"]["answer_model"],
            "eval_model": CONFIG["llm"]["eval_model"],
            "timestamp": datetime.now().isoformat(),
            "question_count": len(all_results),
            "mode": (
                "smoke"
                if smoke_test
                else "baseline"
                if set_baseline
                else "candidate"
            )
        }
    )

    print("\nCandidate run saved to:", run_path)

    # --------------------------------------------------
    # SMOKE TEST
    # --------------------------------------------------

    if smoke_test:

        print("\n🧪 Smoke test completed.")
        print("Baseline was NOT modified.")
        print("No deployment decision was made.")

        return

    # --------------------------------------------------
    # EXPLICIT BASELINE CREATION
    # --------------------------------------------------

    if set_baseline:

        save_baseline(
            all_results,
            metadata={
                "created_at": datetime.now().isoformat(),
                "source_run": run_path,
                "answer_model": CONFIG["llm"]["answer_model"],
                "eval_model": CONFIG["llm"]["eval_model"],
                "question_count": len(all_results)
            }
        )

        print("\n✅ New baseline created successfully.")
        print("Deployment baseline:", BASELINE_PATH)

        return

    # --------------------------------------------------
    # Load baseline
    # --------------------------------------------------

    baseline = load_baseline()

    if baseline is None:

        print("\n❌ NO BASELINE FOUND")
        print("Candidate evaluation cannot be approved.")
        print(
            "Create an explicit baseline using:"
        )
        print(
            "python app.py --set-baseline"
        )

        sys.exit(1)

    # --------------------------------------------------
    # Validate dataset
    # --------------------------------------------------

    compatible, differences = validate_dataset(
        baseline["results"],
        all_results
    )

    if not compatible:

        print("\n❌ BASELINE DATASET MISMATCH")

        if differences["missing_from_current"]:
            print("\nQuestions missing from candidate:")

            for question in differences["missing_from_current"]:
                print("-", question)

        if differences["new_in_current"]:
            print("\nNew questions in candidate:")

            for question in differences["new_in_current"]:
                print("-", question)

        print(
            "\nRegression evaluation stopped."
        )

        print(
            "The baseline and candidate must use the same test dataset."
        )

        print(
            "\nIf you intentionally changed the evaluation dataset,"
        )

        print(
            "create a new baseline with:"
        )

        print(
            "python app.py --set-baseline"
        )

        sys.exit(1)

    # --------------------------------------------------
    # Regression check
    # --------------------------------------------------

    failures, warnings = check_regression(
        baseline["results"],
        all_results
    )

    # --------------------------------------------------
    # HARD FAILURES
    # --------------------------------------------------

    if failures:

        print("\n❌ DEPLOYMENT BLOCKED")

        print("\nRegression failures:")

        for failure in failures:
            print(
                f" - {failure['question']}"
            )
            print(
                f"   Reason: {failure['reason']}"
            )
            print(
                f"   Baseline: {failure['baseline']:.4f}"
            )
            print(
                f"   Candidate: {failure['candidate']:.4f}"
            )
            print(
                f"   Drop: {failure['drop']:.4f}"
            )

        # --------------------------------------------------
        # Warnings
        # --------------------------------------------------

        if warnings:

            print("\n⚠️ Warnings:")

            for warning in warnings:
                print(
                    f" - {warning['question']}"
                )
                print(
                    f"   Reason: {warning['reason']}"
                )
                print(
                    f"   Baseline: {warning['baseline']:.4f}"
                )
                print(
                    f"   Candidate: {warning['candidate']:.4f}"
                )
                print(
                    f"   Drop: {warning['drop']:.4f}"
                )

        print("\nCandidate run rejected.")
        print("Existing baseline remains unchanged.")

        sys.exit(1)

    # --------------------------------------------------
    # Warnings only
    # --------------------------------------------------

    if warnings:

        print("\n⚠️ DEPLOYMENT APPROVED WITH WARNINGS")

        for warning in warnings:

            print(
                f" - {warning['question']}"
            )

            print(
                f"   Reason: {warning['reason']}"
            )

    else:

        print("\n✅ NO REGRESSIONS DETECTED")

    # --------------------------------------------------
    # Promote candidate
    # --------------------------------------------------

    save_baseline(
        all_results,
        metadata={
            "promoted_at": datetime.now().isoformat(),
            "source_run": run_path,
            "answer_model": CONFIG["llm"]["answer_model"],
            "eval_model": CONFIG["llm"]["eval_model"],
            "question_count": len(all_results)
        }
    )

    print("\n✅ Candidate promoted to new baseline")
    print("Deployment approved.")


# --------------------------------------------------
# Entry point
# --------------------------------------------------

if __name__ == "__main__":
    main()