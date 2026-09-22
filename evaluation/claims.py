# evaluation/claims.py
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

CLAIM_PROMPT = """
You are a system that extracts factual claims.

Rules:
- Extract ONLY explicit factual statements
- Each claim must be atomic
- Do NOT infer or add new facts
- Ignore opinions or vague statements

Output MUST be valid JSON in this exact format:

{{
  "claims": [
    {{"id": 1, "text": "claim text here"}},
    {{"id": 2, "text": "claim text here"}}
  ]
}}

Text:
{answer}
"""


def extract_claims(answer: str):
    try:
        response = client.chat.completions.create(
            model=CONFIG["llm"]["eval_model"],
            temperature=CONFIG["llm"]["temperature"],
            reasoning_effort="none",
            max_tokens=300,
            messages=[
                {
                    "role": "system",
                    "content": "You extract factual claims and output ONLY valid JSON."
                },
                {
                    "role": "user",
                    "content": CLAIM_PROMPT.format(answer=answer)
                }
            ],
        )

        raw = response.choices[0].message.content.strip()

        start = raw.find("{")
        end = raw.rfind("}")

        if start != -1 and end != -1 and end > start:
            raw = raw[start:end + 1]

        parsed = json.loads(raw)

        claims = parsed.get("claims")

        if not isinstance(claims, list):
            return None

        return claims

    except Exception:
        return None
if __name__ == "__main__":
    answer = "Mars has two moons. It has liquid water on its surface."
    claims = extract_claims(answer)
    print(claims)
