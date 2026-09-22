# rag/pipeline.py
from config import CONFIG
from rag.retriever import build_vectorstore, retrieve
from rag.generator import generate_answer
from evaluation.claims import extract_claims
from evaluation.faithfulness import compute_faithfulness
from evaluation.coverage import compute_coverage
from evaluation.final_score import compute_final_score



class RAGPipeline:
    def __init__(self):
        self.vectordb = build_vectorstore()

    def run(self, question):
        docs = retrieve(
            question,
            self.vectordb,
            k=CONFIG["retriever"]["top_k"]
        )
        answer = generate_answer(question, docs)
        claims = extract_claims(answer)

        if claims is None:
            claims = []
            extraction_failed = True
        else:
            extraction_failed = False

        faithfulness_score, faithfulness_details = compute_faithfulness(claims, docs)

        coverage_score, coverage_details = compute_coverage(
            question,
            claims,
            docs,
            extraction_failed=extraction_failed
        )
        
        final_score = compute_final_score(
            faithfulness_score,
            coverage_score
        )

        
        return {
            "question": question,
            "answer": answer,
            "claims": claims,
            "documents": docs,

            "faithfulness_score": faithfulness_score,
            "faithfulness_details": faithfulness_details,

            "claim_extraction_failed": extraction_failed,

            "coverage_score": coverage_score,
            "coverage_details": coverage_details,

            "final_score": final_score

        }
