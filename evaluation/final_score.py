# evaluation/final_score.py

FAITHFULNESS_WEIGHT = 0.7
COVERAGE_WEIGHT = 0.3


def compute_final_score(faithfulness, coverage):
    return (
        FAITHFULNESS_WEIGHT * faithfulness +
        COVERAGE_WEIGHT * coverage
    )
