from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from pathlib import Path
from config import CONFIG

def build_vectorstore(doc_path="data/documents"):
    if doc_path is None:
        doc_path = CONFIG["paths"]["documents_dir"]

    docs = []
    for file in Path(doc_path).glob("*.txt"):
        docs.append(file.read_text(encoding="utf-8"))

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CONFIG["retriever"]["chunk_size"],
        chunk_overlap=CONFIG["retriever"]["chunk_overlap"],
    )

    chunks = splitter.create_documents(docs)

    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )

    vectordb = FAISS.from_documents(chunks, embeddings)
    return vectordb

def retrieve(query, vectordb, k=None):
    if k is None:
        k = CONFIG["retriever"]["top_k"]
    return vectordb.similarity_search(query, k=k)
