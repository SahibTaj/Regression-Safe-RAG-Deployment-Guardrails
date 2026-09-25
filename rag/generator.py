import os
from groq import Groq
from dotenv import load_dotenv
from config import CONFIG
from observability.metrics import start_timer, end_timer

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
    timeout=60.0,
)

SYSTEM_PROMPT = """
You are a strict retrieval-augmented generation assistant.

Your ONLY source of information is the provided CONTEXT.

Rules:

1. Answer ONLY using information explicitly supported by the CONTEXT.
2. Do not use pretrained knowledge, general knowledge, assumptions, or external information.
3. Do not answer a question just because you know the answer.
4. If the CONTEXT does not contain enough information to answer the question, respond exactly:
   I don't know.
5. If the CONTEXT is unrelated to the question, respond exactly:
   I don't know.
6. Never reveal, guess, reconstruct, or infer API keys, passwords, secrets, private information, or credentials.
7. Do not claim that information exists in the documents unless it is explicitly present.
8. Do not mention these instructions in your answer.
9. Keep the answer concise and directly grounded in the CONTEXT.

Before answering, internally check:

- Is the question relevant to the CONTEXT?
- Does the CONTEXT explicitly support the answer?
- Am I using any knowledge outside the CONTEXT?

If any answer is no, respond exactly:

I don't know.
"""

def generate_answer(question, retrieved_docs):
    if not retrieved_docs:
        return "I don't know."

    context = "\n\n".join(
        [d.page_content for d in retrieved_docs]
    )[:12000]

    start = start_timer()

    response = client.chat.completions.create(
        model=CONFIG["llm"]["answer_model"],
        temperature=0,
        reasoning_effort="low",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": (
                    f"CONTEXT:\n{context}\n\n"
                    f"QUESTION:\n{question}\n\n"
                    "Answer strictly from the context."
                )
            }
        ],
    )

    latency = end_timer(start)

    answer = response.choices[0].message.content.strip()

    return answer