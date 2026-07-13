"""
retriever.py — Sprint 3, Step 3.4
Aged Care PMS — CareAssist RAG Foundation

Queries the ChromaDB collection built by embedder.py to find the most
relevant Ngā Paerewa resource entries for a given question. This is the
"R" in RAG — retrieval only, no generation. Results get combined with
context_injector.py's resident-specific context in prompt_builder.py
(Step 3.5) before being sent to Claude.

Path handling note: DEFAULT_DB_PATH is computed relative to THIS FILE's own
location (os.path.dirname(__file__)), not the current working directory.
This matters because uvicorn/main.py will import this module from backend/,
while this file itself lives in backend/careassist/ alongside chroma_db/ —
using a plain relative path like "./chroma_db" would resolve against
whatever directory the app happens to be launched from, not this file's
folder, and silently look in the wrong place (this exact class of bug was
caught and fixed in inference.py during Sprint 1).

Usage (called from main.py, not run standalone — but can be run directly
for a quick manual test):
    python retriever.py --query "medication administration guidelines"
"""

import argparse
import os

import chromadb

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "nga_paerewa_resources"

_client = None
_collection = None


def _load_collection(db_path: str = DEFAULT_DB_PATH):
    """Loads the collection once and reuses it — avoids reopening the
    ChromaDB client on every single query call."""
    global _client, _collection
    if _collection is not None:
        return _collection
    _client = chromadb.PersistentClient(path=db_path)
    _collection = _client.get_collection(COLLECTION_NAME)
    return _collection


def retrieve_relevant_resources(query: str, n_results: int = 3, db_path: str = DEFAULT_DB_PATH) -> list:
    """Returns up to n_results resource chunks most relevant to `query`, each
    as {text, url, category_title, category_number, source_document,
    relevance_score}. relevance_score is 1 - distance, clipped to [0, 1] for
    readability (ChromaDB returns cosine distance by default — lower means
    more similar, which is the opposite of intuitive, so we flip it here)."""
    collection = _load_collection(db_path)

    results = collection.query(query_texts=[query], n_results=n_results)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    resources = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        relevance_score = max(0.0, min(1.0, 1.0 - dist))
        resources.append({
            "text": doc,
            "url": meta.get("url"),
            "category_title": meta.get("category_title"),
            "category_number": meta.get("category_number"),
            "source_document": meta.get("source_document"),
            "relevance_score": round(relevance_score, 3),
        })

    return resources


def main():
    parser = argparse.ArgumentParser(description="Query the Ngā Paerewa resource collection (manual test tool).")
    parser.add_argument("--query", required=True, help="Question or topic to search for")
    parser.add_argument("--n_results", type=int, default=3)
    parser.add_argument("--db_path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()

    results = retrieve_relevant_resources(args.query, n_results=args.n_results, db_path=args.db_path)

    print(f"Query: {args.query}\n")
    if not results:
        print("No results found.")
        return

    for i, r in enumerate(results, 1):
        print(f"{i}. [{r['category_title']}] (relevance: {r['relevance_score']})")
        print(f"   {r['text'][:150]}...")
        print(f"   {r['url']}")
        print()


if __name__ == "__main__":
    main()