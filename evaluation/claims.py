# evaluation/claims.py
import os
import json
from groq import Groq
from dotenv import load_dotenv
from config import CONFIG

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
    response = client.chat.completions.create(
        model = CONFIG["llm"]["eval_model"],
    temperature = CONFIG["llm"]["temperature"],
        messages=[
            {"role": "system", "content": "You extract factual claims."},
            {
                "role": "user",
                "content": CLAIM_PROMPT.format(answer=answer)
            }
        ],
    )

    raw = response.choices[0].message.content

    try:
        parsed = json.loads(raw)
        return parsed["claims"]
    except Exception as e:
        return None

if __name__ == "__main__":
    answer = "Mars has two moons. It has liquid water on its surface."
    claims = extract_claims(answer)
    print(claims)
