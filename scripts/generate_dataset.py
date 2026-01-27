# Generates 10–20+ plain .txt files into: data/documents/
# Sources:
# 1) Wikipedia summaries + full text (factual)
# 2) A few official documentation pages (LangChain/FastAPI/Streamlit)

import os
import re
import time
import requests
import wikipediaapi


# ✅ Change output dir here (as you requested)
out_dir = "data/documents"


WIKI_TOPICS = [
    "Transformer (machine learning)",
    "Attention (machine learning)",
    "BERT (language model)",
    "Generative pre-trained transformer",
    "Retrieval-augmented generation",
    "Word embedding",
    "Cosine similarity",
    "Vector database",
    "Approximate nearest neighbor search",
    "FAISS",
    "ONNX Runtime",
    "Quantization (signal processing)",
    "Machine learning",
    "Deep learning",
    "Natural language processing",
]

DOC_URLS = [
    "https://docs.langchain.com/docs/how_to/retrieval",
    "https://docs.langchain.com/docs/how_to/vectorstores",
    "https://fastapi.tiangolo.com/",
    "https://docs.streamlit.io/",
    "https://onnxruntime.ai/docs/",
]


def safe_filename(name: str) -> str:
    name = name.strip()
    name = re.sub(r"[^\w\- ]+", "", name)
    name = name.replace(" ", "_")
    return name[:120]


def save_txt(path: str, content: str):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def clean_text(text: str) -> str:
    """
    Cleans ugly Wikipedia math/latex formatting and noisy tokens.
    Makes text embedding-friendly for RAG.
    """
    if not text:
        return ""

    # Remove Wikipedia display math blocks: {\displaystyle ...}
    text = re.sub(r"\{\s*\\displaystyle\s*[^}]*\}", " ", text)

    # Remove LaTeX inline math: \( ... \) and \[ ... \]
    text = re.sub(r"\\\((.*?)\\\)", " ", text)
    text = re.sub(r"\\\[(.*?)\\\]", " ", text)

    # Remove remaining backslashes often used in latex
    text = text.replace("\\", " ")

    # Remove leftover braces
    text = re.sub(r"[{}]", " ", text)

    # Remove weird unicode artifacts / excess spacing
    text = re.sub(r"\s+", " ", text).strip()

    return text


def fetch_url_text(url: str) -> str:
    """
    Simple HTML -> plain text extraction (no BeautifulSoup).
    This is a lightweight extractor; good enough for RAG dataset generation.
    """
    headers = {
        "User-Agent": "RAG-Dataset-Generator/1.0 (Educational RAG Project; contact: sahibtajsingh1@gmail.com)"
    }
    r = requests.get(url, headers=headers, timeout=25)
    r.raise_for_status()

    html = r.text

    # remove script/style
    html = re.sub(r"(?is)<script.*?>.*?</script>", " ", html)
    html = re.sub(r"(?is)<style.*?>.*?</style>", " ", html)

    # remove html tags
    text = re.sub(r"(?s)<.*?>", " ", html)

    # decode common HTML entities (basic)
    text = text.replace("&nbsp;", " ")
    text = text.replace("&amp;", "&")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")

    # clean whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # final clean
    text = clean_text(text)

    return text


def generate_wikipedia_files():
    wiki = wikipediaapi.Wikipedia(
        language="en",
        user_agent="RAG-Dataset-Generator/1.0 (educational project; contact: sahibtajsingh1@gmail.com)",
        extract_format=wikipediaapi.ExtractFormat.WIKI
    )

    count = 0
    for topic in WIKI_TOPICS:
        page = wiki.page(topic)

        if not page.exists():
            print(f"❌ Wikipedia page not found: {topic}")
            continue

        filename = safe_filename(f"wiki_{page.title}") + ".txt"
        path = os.path.join(out_dir, filename)

        summary = clean_text(page.summary)
        full_text = clean_text(page.text)

        content = (
            f"Source: Wikipedia\n"
            f"Title: {page.title}\n\n"
            f"Summary:\n{summary}\n\n"
            f"Full Text:\n{full_text}\n"
        )

        save_txt(path, content)
        count += 1
        print(f"✅ Saved Wikipedia: {path}")

        # be polite
        time.sleep(0.4)

    return count


def generate_docs_files():
    count = 0
    for i, url in enumerate(DOC_URLS, start=1):
        try:
            text = fetch_url_text(url)
        except Exception as e:
            print(f"❌ Failed to fetch {url}: {e}")
            continue

        filename = safe_filename(f"docs_{i}_{url}") + ".txt"
        path = os.path.join(out_dir, filename)

        content = (
            f"Source: Documentation Web Page\n"
            f"URL: {url}\n\n"
            f"Extracted Text:\n{text}\n"
        )

        save_txt(path, content)
        count += 1
        print(f"✅ Saved Docs: {path}")

        time.sleep(0.4)

    return count


def main():
    os.makedirs(out_dir, exist_ok=True)
    print(f"📁 Output directory: {out_dir}")

    wiki_count = generate_wikipedia_files()
    docs_count = generate_docs_files()

    total = wiki_count + docs_count

    print("\n====================")
    print("✅ Dataset Generated")
    print("====================")
    print(f"Wikipedia files: {wiki_count}")
    print(f"Docs files:      {docs_count}")
    print(f"TOTAL files:     {total}")
    print("====================\n")


if __name__ == "__main__":
    main()
