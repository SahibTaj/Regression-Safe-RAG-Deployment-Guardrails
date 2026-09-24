
# rag/pipeline.py

from config import CONFIG
from rag.retriever import build_vectorstore, retrieve
from rag.generator import generate_answer
from evaluation.claims import extract_claims
from evaluation.faithfulness import compute_faithfulness
from evaluation.coverage import compute_coverage
from evaluation.final_score import compute_final_score


ABSTENTION_TEXTS = {
    "i don't know",
    "i don't know.",
}


def is_abstention(answer: str) -> bool:
    """Return True when the model refuses to answer."""
    return answer.strip().lower() in ABSTENTION_TEXTS


class RAGPipeline:

    def __init__(self):
        self.vectordb = build_vectorstore()

    def run(self, question: str):

        # --------------------------------------------------
        # RETRIEVAL
        # --------------------------------------------------

        docs = retrieve(
            question,
            self.vectordb,
            k=CONFIG["retriever"]["top_k"]
        )

        # --------------------------------------------------
        # ANSWER GENERATION
        # --------------------------------------------------

        generated_answer = generate_answer(
            question,
            docs
        )

        # --------------------------------------------------
        # CLAIM EXTRACTION
        # --------------------------------------------------

        claims = extract_claims(generated_answer)

        if claims is None:
            claims = []
            extraction_failed = True
        else:
            extraction_failed = False

        # --------------------------------------------------
        # FAITHFULNESS EVALUATION
        # --------------------------------------------------

        faithfulness_score, faithfulness_details = (
            compute_faithfulness(
                claims,
                docs
            )
        )

        # --------------------------------------------------
        # COVERAGE / ANSWERABILITY EVALUATION
        # --------------------------------------------------

        coverage_score, coverage_details = compute_coverage(
            question=question,
            claims=claims,
            retrieved_docs=docs,
            extraction_failed=extraction_failed
        )

        answerable = coverage_details.get(
            "answerable",
            False
        )

        original_answer_was_abstention = is_abstention(
            generated_answer
        )

        # --------------------------------------------------
        # SAFETY DECISION
        # --------------------------------------------------

        safety_reasons = []

        if extraction_failed:
            safety_reasons.append(
                "Claim extraction failed"
            )

        if faithfulness_score < 1.0 and not original_answer_was_abstention:
            safety_reasons.append(
                "One or more generated claims were not supported"
            )

        if (
            not answerable
            and not original_answer_was_abstention
        ):
            safety_reasons.append(
                "Model answered despite insufficient context"
            )

        answer_was_blocked = bool(safety_reasons)

        # --------------------------------------------------
        # FINAL USER-FACING ANSWER
        # --------------------------------------------------



        if answer_was_blocked:
            answer = "I don't know."
        else:
            answer = generated_answer

        # --------------------------------------------------
        # ANSWER STATUS
        # --------------------------------------------------

        if extraction_failed:
            answer_status = "evaluation_error"

        elif original_answer_was_abstention and not answerable:
            answer_status = "safely_abstained"

        elif original_answer_was_abstention and answerable:
            answer_status = "incorrect_abstention"

        elif answer_was_blocked:
            answer_status = "unsupported_answer"

        else:
            answer_status = "answered"

        # --------------------------------------------------
        # SAFETY STATUS
        # --------------------------------------------------

        if answer_status == "evaluation_error":
            safety_status = "evaluation_error"

        elif answer_status == "unsupported_answer":
            safety_status = "blocked"

        elif answer_status == "safely_abstained":
            safety_status = "safe_abstention"

        elif answer_status == "incorrect_abstention":
            safety_status = "warning"

        else:
            safety_status = "approved"

        # --------------------------------------------------
        # FINAL SCORE
        # --------------------------------------------------

        if extraction_failed:
            faithfulness_score = 0.0
            coverage_score = 0.0
            final_score = 0.0

        elif not answerable and not original_answer_was_abstention:
            # The model answered a question that the context
            # could not support.
            coverage_score = 0.0

            final_score = compute_final_score(
                faithfulness_score,
                coverage_score
            )

        else:
            final_score = compute_final_score(
                faithfulness_score,
                coverage_score
            )

        # --------------------------------------------------
        # BLOCK REASON
        # --------------------------------------------------

        if extraction_failed:
            block_reason = "claim_extraction_failed"

        elif (
            faithfulness_score < 1.0
            and not original_answer_was_abstention
        ):
            block_reason = "unsupported_claims"

        elif (
            not answerable
            and not original_answer_was_abstention
        ):
            block_reason = "insufficient_context"

        else:
            block_reason = None

        # --------------------------------------------------
        # RESULT
        # --------------------------------------------------

        return {
            "question": question,

            # Original model output before safety filtering
            "generated_answer": generated_answer,

            # Safe answer shown to the user
            "answer": answer,

            "claims": claims,
            "documents": docs,

            "faithfulness_score": faithfulness_score,
            "faithfulness_details": faithfulness_details,

            "claim_extraction_failed": extraction_failed,

            "coverage_score": coverage_score,
            "coverage_details": coverage_details,

            "answerable": answerable,
            "answer_was_blocked": answer_was_blocked,
            "answer_status": answer_status,
            
            "safety_status": safety_status,
            "safety_reasons": safety_reasons,

            "final_score": final_score,

            "block_reason": block_reason,
        }