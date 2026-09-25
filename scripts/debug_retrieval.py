from rag.retriever import build_vectorstore, retrieve


QUESTIONS = [
    "What is RAG and why is it used?",
    "What is FAISS?",
]


def main():
    vectorstore = build_vectorstore()

    for question in QUESTIONS:
        print("\n" + "=" * 80)
        print("QUESTION:", question)
        print("=" * 80)

        documents = retrieve(
            question,
            vectorstore,
            k=4
        )

        if not documents:
            print("NO DOCUMENTS RETRIEVED")
            continue

        for index, document in enumerate(documents, start=1):
            print(f"\n--- DOCUMENT {index} ---")
            print("Metadata:", document.metadata)
            print("Content:")
            print(document.page_content[:2000])


if __name__ == "__main__":
    main()