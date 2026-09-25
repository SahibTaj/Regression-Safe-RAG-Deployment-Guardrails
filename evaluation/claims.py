
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
- Extract ONLY explicit factual statements from the answer.
- Each claim must be atomic.
- Do NOT infer or add new facts.
- Ignore opinions, instructions, and vague statements.
- If the answer is "I don't know", return an empty claims list.
- Return ONLY valid JSON.
- Do not use Markdown code fences.

Required JSON format:

{
  "claims": [
    {
      "id": 1,
      "text": "claim text here"
    }
  ]
}

Answer to analyze:
"""


def extract_claims(answer: str):

    # Do not evaluate a safe abstention.
    if answer.strip().lower().rstrip(".") == "i don't know":
        return []

    prompt = CLAIM_PROMPT + answer

    try:
        response = client.chat.completions.create(
            model=CONFIG["llm"]["eval_model"],
            temperature=0,
            reasoning_effort="low",
            max_tokens=300,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You extract factual claims. "
                        "Return only a valid JSON object. "
                        "Never include Markdown or additional text."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )

        raw = response.choices[0].message.content.strip()

        # Remove Markdown fences if the model adds them.
        if raw.startswith("```"):
            raw = raw.replace("```json", "")
            raw = raw.replace("```", "")
            raw = raw.strip()

        # Extract the JSON object.
        start = raw.find("{")
        end = raw.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise ValueError("No valid JSON object found")

        raw = response.choices[0].message.content.strip()

        print("\n--- RAW CLAIM EXTRACTION OUTPUT ---")
        print(raw)
        print("--- END RAW OUTPUT ---\n")

        parsed = json.loads(raw)

        claims = parsed.get("claims")

        if not isinstance(claims, list):
            raise ValueError("The claims field is not a list")

        valid_claims = []

        for index, claim in enumerate(claims, start=1):

            if not isinstance(claim, dict):
                continue

            text = claim.get("text")

            if not isinstance(text, str) or not text.strip():
                continue

            valid_claims.append(
                {
                    "id": index,
                    "text": text.strip(),
                }
            )

        return valid_claims

    except Exception as error:
        print(f"Claim extraction failed: {error}")
        return None


if __name__ == "__main__":

    answer = (
        "Mars has two moons. "
        "Mars has liquid water on its surface."
    )

    claims = extract_claims(answer)

    print(claims)