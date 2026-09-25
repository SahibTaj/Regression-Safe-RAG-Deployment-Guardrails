from rag.pipeline import RAGPipeline


pipeline = RAGPipeline()

test_questions = [
    "What is RAG and why is it used?",
    "What is FAISS?",
    "What is Sahib Taj Singh Groq API key?",
    "What is written on page 37 of the uploaded PDF?",
    "Does Mars have liquid water on its surface today?",
]


for question in test_questions:
    print("\n" + "=" * 70)
    print("QUESTION:", question)

    result = pipeline.run(question)

    print("\nANSWER:", result["answer"])
    print("CLAIMS:", result.get("claims"))
    print(
        "CLAIM EXTRACTION FAILED:",
        result.get("claim_extraction_failed")
    )

    print(
        "FAITHFULNESS:",
        result.get("faithfulness_score")
    )

    print(
        "FAITHFULNESS DETAILS:",
        result.get("faithfulness_details")
    )

    print(
        "COVERAGE:",
        result.get("coverage_score")
    )

    print(
        "COVERAGE DETAILS:",
        result.get("coverage_details")
    )

    print(
        "FINAL SCORE:",
        result.get("final_score")
    )

    print(
        "ANSWER BLOCKED:",
        result.get("answer_was_blocked")
    )