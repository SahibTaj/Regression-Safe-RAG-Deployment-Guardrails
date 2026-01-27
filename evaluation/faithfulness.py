import os
import json
from groq import Groq
from dotenv import load_dotenv
from config import CONFIG

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

VERIFICATION_PROMPT = """
You are verifying factual claims against provided context.

Rules:
- Decide ONLY if the claim is supported by the context
- If context does not clearly support the claim, mark it unsupported
- Do NOT use external knowledge
- Evidence must come from the context (quote or short explanation)

Return ONLY valid JSON in this exact format:

{{
  "supported": true,
  "evidence": "evidence from context (max 25 words)"
}}

Context:
{context}

Claim:
{claim}
"""


def verify_claim(claim_text: str, retrieved_docs: list):
    context = "\n\n".join([d.page_content for d in retrieved_docs])[:12000]

    response = client.chat.completions.create(
        model = CONFIG["llm"]["eval_model"],
    temperature = CONFIG["llm"]["temperature"],
        messages=[
            {"role": "system", "content": "You verify claims strictly and output ONLY valid JSON."},
            {
                "role": "user",
                "content": VERIFICATION_PROMPT.format(
                    context=context,
                    claim=claim_text
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
        return json.loads(raw)
    except Exception:
        return {"supported": False, "evidence": "parse_error"}


def compute_faithfulness(claims, retrieved_docs):
    if not claims:
        return 1.0, []

    results = []
    supported_count = 0

    for claim in claims:
        verdict = verify_claim(claim["text"], retrieved_docs)
        verdict["claim"] = claim["text"]
        results.append(verdict)

        if verdict.get("supported") is True:
            supported_count += 1

    score = supported_count / len(claims)
    return score, results
