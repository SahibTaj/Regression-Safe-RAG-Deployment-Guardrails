from evaluation.regression import check_regression


baseline = [
    {
        "question": "What is RAG?",
        "faithfulness": 0.95,
        "coverage": 0.90,
        "final_score": 0.92,
    }
]

current = [
    {
        "question": "What is RAG?",
        "faithfulness": 0.90,
        "coverage": 0.85,
        "final_score": 0.80,
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


assert len(failures) == 2, "Expected 2 failures"
assert len(warnings) == 1, "Expected 1 warning"

print("\nRegression test passed!")