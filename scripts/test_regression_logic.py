from evaluation.regression import check_regression


baseline = [
    {
        "question": "What is RAG?",
        "faithfulness": 0.84,
        "coverage": 0.82,
        "final_score": 0.83,
    }
]

current = [
    {
        "question": "What is RAG?",
        "faithfulness": 0.86,
        "coverage": 0.84,
        "final_score": 0.85,
    }
]


failures, warnings = check_regression(
    baseline=baseline,
    current=current,
    final_threshold=0.05,
)


print("\n--- REGRESSION TEST ---")

print("\nFailures:")
for failure in failures:
    print(failure)

print("\nWarnings:")
for warning in warnings:
    print(warning)

assert len(failures) == 0, "Expected 0 failures"
assert len(warnings) == 0, "Expected 0 warnings"

print("\nRegression test passed!")