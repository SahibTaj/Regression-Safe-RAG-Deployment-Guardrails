def check_regression(baseline, current, final_threshold=0.05):
    failures = []
    warnings = []

    for b, c in zip(baseline, current):

        # HARD GATE
        if c["faithfulness"] < b["faithfulness"]:
            failures.append({
                "question": b["question"],
                "reason": "Faithfulness regression"
            })

        # SOFT SIGNAL
        if c["coverage"] < b["coverage"]:
            warnings.append({
                "question": b["question"],
                "reason": "Coverage regression"
            })

        # FINAL SCORE DROP
        if (b["final_score"] - c["final_score"]) > final_threshold:
            failures.append({
                "question": b["question"],
                "reason": "Final score regression"
            })

    return failures, warnings

