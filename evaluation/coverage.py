# evaluation/coverage.py
import os
import json
from groq import Groq
from dotenv import load_dotenv
from config import CONFIG

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
    timeout=60.0,
)

COVERAGE_PROMPT = """
You are judging answerability strictly from the provided context.

Rules:
- Decide ONLY if the context contains sufficient information to answer the question
- Do NOT use external or general knowledge
- If the context partially mentions the topic but lacks details, mark as NOT answerable
- Do NOT answer the question

Return ONLY valid JSON in this exact format:

{{
  "answerable": true,
  "reason": "short explanation (max 20 words)"
}}

Context:
{context}

Question:
{question}
"""

def is_answerable(question: str, retrieved_docs: list):
    context = "\n\n".join([d.page_content for d in retrieved_docs])

    response = client.chat.completions.create(
        model=CONFIG["llm"]["eval_model"],
        temperature=0,
        reasoning_effort="none",
        max_tokens=150,
        messages=[
            {"role": "system", "content": "You judge answerability strictly from context."},
            {
                "role": "user",
                "content": COVERAGE_PROMPT.format(
                    context=context,
                    question=question
                )
            }
        ],
    )

    raw = response.choices[0].message.content.strip()

    try:
        return json.loads(raw)
    except Exception:
        return {"answerable": False, "reason": "parse_error"}
    
def compute_coverage(
    question,
    claims,
    retrieved_docs,
    extraction_failed=False
):
    verdict = is_answerable(question, retrieved_docs)

    answerable = verdict["answerable"]

    # No claims can mean either:
    # 1. The model genuinely abstained, or
    # 2. Claim extraction failed.
    #
    # Only treat it as abstention when extraction succeeded.
    abstained = (
        len(claims) == 0
        and not extraction_failed
    )

    # Only penalize genuine abstention when the context
    # actually contains enough information to answer.
    if answerable and abstained:
        score = 0.0
    else:
        score = 1.0

    return score, {
        "answerable": answerable,
        "abstained": abstained,
        "extraction_failed": extraction_failed,
        "reason": verdict["reason"]
    }