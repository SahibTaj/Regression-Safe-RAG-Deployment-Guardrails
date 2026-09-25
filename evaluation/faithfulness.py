import os
import json
import time
from groq import Groq, RateLimitError
from dotenv import load_dotenv
from config import CONFIG

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
    timeout=60.0,
)

VERIFICATION_PROMPT = """
You are verifying multiple factual claims against provided context.

Rules:
- Decide ONLY if each claim is supported by the context.
- If the context does not clearly support a claim, mark it unsupported.
- Do NOT use external knowledge.
- Evidence must come from the context.
- Evidence must be no more than 25 words.
- Evaluate every claim independently.

Return ONLY valid JSON in this exact format:

{{
  "verdicts": [
    {{
      "claim_id": 1,
      "supported": true,
      "evidence": "short evidence from context"
    }}
  ]
}}

Context:
{context}

Claims:
{claims}
"""


def verify_claims(claims: list, retrieved_docs: list):
    """
    Verify all claims in a single LLM call.
    """

    context = "\n\n".join(
        [d.page_content for d in retrieved_docs]
    )[:12000]

    claims_text = json.dumps(
        claims,
        ensure_ascii=False
    )

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=CONFIG["llm"]["eval_model"],
                temperature=CONFIG["llm"]["temperature"],
                reasoning_effort="low",
                max_tokens=1000,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You verify factual claims strictly "
                            "against provided context and output ONLY valid JSON."
                        )
                    },
                    {
                        "role": "user",
                        "content": VERIFICATION_PROMPT.format(
                            context=context,
                            claims=claims_text
                        )
                    }
                ],
            )

            raw = response.choices[0].message.content.strip()

            try:
                start = raw.find("{")
                end = raw.rfind("}")

                if start != -1 and end != -1 and end > start:
                    raw = raw[start:end + 1]

                parsed = json.loads(raw)

                if "verdicts" not in parsed:
                    raise ValueError("Missing verdicts field")

                return parsed["verdicts"]

            except Exception:
                return [
                    {
                        "claim_id": claim["id"],
                        "supported": False,
                        "evidence": "parse_error"
                    }
                    for claim in claims
                ]

        except RateLimitError as e:
            error_message = str(e)

            # Daily token limit cannot be fixed by retrying
            if "tokens per day" in error_message or "TPD" in error_message:
                print("Daily Groq token limit reached. Stopping evaluation.")
                raise

            # Temporary TPM limit
            if attempt == 2:
                raise

            print(
                f"Rate limit reached. Retrying in 5 seconds... "
                f"(attempt {attempt + 1}/3)"
            )

            time.sleep(5)

    return []


def compute_faithfulness(claims, retrieved_docs):
    if not claims:
        return 1.0, []

    verdicts = verify_claims(
        claims,
        retrieved_docs
    )
    print("\n--- FAITHFULNESS VERDICTS ---")

    for verdict in verdicts:
        print(verdict)

    verdict_map = {
        verdict.get("claim_id"): verdict
        for verdict in verdicts
    }

    results = []
    supported_count = 0

    for claim in claims:
        verdict = verdict_map.get(
            claim["id"],
            {
                "supported": False,
                "evidence": "missing_verdict"
            }
        )

        result = {
            "claim": claim["text"],
            "supported": verdict.get("supported", False),
            "evidence": verdict.get("evidence", "")
        }

        results.append(result)

        if result["supported"] is True:
            supported_count += 1

    score = supported_count / len(claims)

    return score, results