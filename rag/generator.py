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

SYSTEM_PROMPT = (
    "You are a question-answering assistant.\n"
    "Answer ONLY using the provided context.\n"
    "If the answer is not in the context, say exactly: I don't know."
)

def generate_answer(question, retrieved_docs):
    context = "\n\n".join([d.page_content for d in retrieved_docs])[:12000]

    start = start_timer()

    response = client.chat.completions.create(
        model=CONFIG["llm"]["answer_model"],
        temperature=CONFIG["llm"]["temperature"],
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion:\n{question}"
            }
        ],
    )

    latency = end_timer(start)

    return response.choices[0].message.content.strip()