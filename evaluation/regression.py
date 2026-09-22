# evaluation/regression.py


def check_regression(
    baseline,
    current,
    final_threshold=0.05
):
    """
    Compare a candidate evaluation against the accepted baseline.

    Rules:
    - Faithfulness regression = HARD failure
    - Coverage regression = SOFT warning
    - Final score drop greater than final_threshold = HARD failure
    - Questions are matched by their question text
    - New candidate questions are ignored because there is no baseline
      to compare them against
    """

    failures = []
    warnings = []

    # Safety check
    if not baseline:
        return failures, warnings

    # ---------------------------------------------------------
    # Build baseline lookup by question
    # ---------------------------------------------------------
    baseline_map = {
        item["question"]: item
        for item in baseline
        if "question" in item
    }

    # ---------------------------------------------------------
    # Compare candidate results
    # ---------------------------------------------------------
    for candidate in current:

        question = candidate.get("question")

        if not question:
            continue

        baseline_result = baseline_map.get(question)

        # No matching baseline question.
        # This is a new test case, not a regression.
        if baseline_result is None:
            continue

        # -----------------------------------------------------
        # Read scores safely
        # -----------------------------------------------------
        baseline_faithfulness = baseline_result.get(
            "faithfulness",
            0.0
        )

        candidate_faithfulness = candidate.get(
            "faithfulness",
            0.0
        )

        baseline_coverage = baseline_result.get(
            "coverage",
            0.0
        )

        candidate_coverage = candidate.get(
            "coverage",
            0.0
        )

        baseline_final = baseline_result.get(
            "final_score",
            0.0
        )

        candidate_final = candidate.get(
            "final_score",
            0.0
        )

        # -----------------------------------------------------
        # HARD GATE: Faithfulness regression
        # -----------------------------------------------------
        if candidate_faithfulness < baseline_faithfulness:

            failures.append({
                "question": question,
                "reason": "Faithfulness regression",
                "baseline": baseline_faithfulness,
                "candidate": candidate_faithfulness,
                "drop": baseline_faithfulness - candidate_faithfulness
            })

        # -----------------------------------------------------
        # SOFT SIGNAL: Coverage regression
        # -----------------------------------------------------
        if candidate_coverage < baseline_coverage:

            warnings.append({
                "question": question,
                "reason": "Coverage regression",
                "baseline": baseline_coverage,
                "candidate": candidate_coverage,
                "drop": baseline_coverage - candidate_coverage
            })

        # -----------------------------------------------------
        # HARD GATE: Final score regression
        # -----------------------------------------------------
        final_drop = baseline_final - candidate_final

        if final_drop > final_threshold:

            failures.append({
                "question": question,
                "reason": "Final score regression",
                "baseline": baseline_final,
                "candidate": candidate_final,
                "drop": final_drop
            })

    return failures, warnings