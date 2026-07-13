"""
embedder.py — Sprint 3, Steps 3.1 + 3.2
Aged Care PMS — CareAssist RAG Foundation

Step 3.1: Parses the Ngā Paerewa Implementation Resources PDF (a categorised
directory of Ngā Paerewa-related guidance documents, legislation, and
resources) into individual chunks — one chunk per resource entry, not per
category — so retrieval can surface the single most relevant resource for a
query rather than an entire category's worth of unrelated entries.

Step 3.2: Embeds each chunk into a local ChromaDB collection, using
ChromaDB's default embedding function (sentence-transformers, runs locally —
no external API key needed for this step; the Anthropic API key is only
needed later, in generator.py, for actual response generation).

Source document scope note: this PDF is a LINK DIRECTORY (~40 pointers to
external guidance/legislation), not the full text of the Ngā Paerewa
Standard itself — that document is copyrighted and technically copy-
protected, so it was deliberately excluded (see project notes). This means
CareAssist's current corpus can point clinicians to the right resource by
name and category, but can't yet quote detailed clinical criteria text
directly. Expanding the corpus with the actual Sector Guidance content
(openly published, not DRM-protected) is a natural next step.

Output: a persistent ChromaDB collection at ./chroma_db, collection name
"nga_paerewa_resources".

Usage:
    python embedder.py --pdf_path "nga-paerewa-implementation-resources-july-2024.pdf" --db_path "./chroma_db"
"""

import argparse
import re

import chromadb
import pdfplumber

CATEGORY_HEADER_RE = re.compile(r"^(\d{1,2})\.\s+(.+)$")
URL_RE = re.compile(r"https?://\S+")


def extract_raw_text(pdf_path: str) -> str:
    """Extracts all text from the PDF, page by page, joined with newlines."""
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts)


def parse_chunks(raw_text: str, source_document: str) -> list:
    """Splits the raw text into one chunk per resource bullet, tagged with
    its parent category. Handles line-wrapped bullets (a single resource
    entry spans multiple lines in the extracted text) by accumulating lines
    until the next bullet or category header starts."""
    lines = raw_text.split("\n")

    chunks = []
    current_category_num = None
    current_category_title = None
    current_bullet_lines: list = []

    def flush_bullet():
        if not current_bullet_lines:
            return
        # Join lines intelligently: a line ending in "-" was almost always
        # broken mid-word/mid-URL by the PDF's line wrap (very common for
        # long govt.nz URLs with many hyphenated path segments) — joining
        # those directly, without inserting a space, reconstructs the
        # original text and keeps URLs actually valid/clickable.
        bullet_text = ""
        for l in current_bullet_lines:
            piece = l.strip()
            if not piece:
                continue
            if bullet_text.endswith("-"):
                bullet_text += piece
            elif bullet_text:
                bullet_text += " " + piece
            else:
                bullet_text = piece
        bullet_text = bullet_text.lstrip("•").strip()
        if not bullet_text:
            return
        url_match = URL_RE.search(bullet_text)
        url = url_match.group(0).rstrip(".,)") if url_match else None
        chunks.append({
            "category_number": current_category_num,
            "category_title": current_category_title,
            "text": bullet_text,
            "url": url,
            "source_document": source_document,
        })

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.isdigit():  # skip blank lines and lone page-number lines
            continue

        header_match = CATEGORY_HEADER_RE.match(stripped)
        if header_match:
            flush_bullet()
            current_bullet_lines = []
            current_category_num = header_match.group(1)
            current_category_title = header_match.group(2)
            continue

        if stripped.startswith("•"):
            flush_bullet()
            current_bullet_lines = [stripped]
        else:
            if current_bullet_lines:
                current_bullet_lines.append(stripped)
            # Lines before the first bullet/category (e.g. the intro
            # paragraph) are intentionally skipped — not a resource entry.

    flush_bullet()
    return chunks


def build_collection(chunks: list, db_path: str, collection_name: str = "nga_paerewa_resources"):
    client = chromadb.PersistentClient(path=db_path)

    # Start clean each run, so re-running embedder.py after a source update
    # doesn't leave stale duplicate entries behind.
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass
    collection = client.create_collection(collection_name)

    ids = [f"chunk_{i:03d}" for i in range(len(chunks))]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "category_number": c["category_number"] or "",
            "category_title": c["category_title"] or "",
            "url": c["url"] or "",
            "source_document": c["source_document"],
        }
        for c in chunks
    ]

    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    return collection


def main():
    parser = argparse.ArgumentParser(description="Chunk and embed the Ngā Paerewa resource directory PDF.")
    parser.add_argument("--pdf_path", required=True, help="Path to the source PDF")
    parser.add_argument("--db_path", default="./chroma_db", help="Where to persist the ChromaDB collection")
    args = parser.parse_args()

    print(f"Extracting text from {args.pdf_path} ...")
    raw_text = extract_raw_text(args.pdf_path)

    print("Chunking into individual resource entries...")
    chunks = parse_chunks(raw_text, source_document="Ngā Paerewa Implementation Resources (July 2024)")
    print(f"Parsed {len(chunks)} resource chunks across "
          f"{len(set(c['category_number'] for c in chunks))} categories.")

    print(f"\nBuilding ChromaDB collection at {args.db_path} ...")
    collection = build_collection(chunks, args.db_path)
    print(f"Collection 'nga_paerewa_resources' now has {collection.count()} embedded chunks.")

    print("\nSample chunks:")
    for c in chunks[:3]:
        print(f"  [{c['category_number']}. {c['category_title']}] {c['text'][:100]}...")


if __name__ == "__main__":
    main()