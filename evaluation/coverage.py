
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
Judge whether the CONTEXT contains enough information to answer the QUESTION.

Rules:
- Use only the provided context.
- Do not use external knowledge.
- Return answerable=true only when the context contains sufficient information.
- Return answerable=false when the context is unrelated or insufficient.
- Keep the reason under 12 words.
- Return ONLY valid JSON.
- Do not use Markdown or code fences.

Required JSON format:
{{
  "answerable": true,
  "reason": "Short explanation"
}}

CONTEXT:
{context}

QUESTION:
{question}
"""


def extract_json_object(raw: str):
    """
    Extract and parse the first JSON object from a model response.
    """

    raw = raw.strip()

    start = raw.find("{")
    end = raw.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("No complete JSON object found")

    json_text = raw[start:end + 1]

    return json.loads(json_text)


def is_answerable(question: str, retrieved_docs: list):

    if not retrieved_docs:
        return {
            "answerable": False,
            "reason": "No relevant context was retrieved."
        }

    context = "\n\n".join(
        document.page_content
        for document in retrieved_docs
    )[:10000]

    try:
        response = client.chat.completions.create(
            model=CONFIG["llm"]["eval_model"],
            temperature=0,
            reasoning_effort="low",
            max_tokens=300,
            response_format={
                "type": "json_object"
            },
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You judge answerability from context. "
                        "Return only valid JSON."
                    )
                },
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

        print("\n--- RAW COVERAGE OUTPUT ---")
        print(raw)
        print("--- END RAW COVERAGE OUTPUT ---")

        parsed = extract_json_object(raw)

        answerable = parsed.get("answerable")
        reason = parsed.get("reason", "")

        if not isinstance(answerable, bool):
            raise ValueError("answerable must be a boolean")

        return {
            "answerable": answerable,
            "reason": str(reason)
        }

    except Exception as error:

        print(f"Coverage evaluation failed: {error}")

        return {
            "answerable": False,
            "reason": "Coverage evaluation failed."
        }


def compute_coverage(
    question,
    claims,
    retrieved_docs,
    extraction_failed=False
):

    verdict = is_answerable(
        question=question,
        retrieved_docs=retrieved_docs
    )

    answerable = verdict["answerable"]

    # An empty claim list is a valid abstention only when
    # claim extraction itself succeeded.
    abstained = (
        len(claims) == 0
        and not extraction_failed
    )

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