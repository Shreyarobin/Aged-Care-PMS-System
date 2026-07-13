"""
generator.py — Sprint 3, Step 3.6 (+ streaming upgrade, Sprint 4 follow-up)
Aged Care PMS — CareAssist RAG Foundation

Main entry point for a CareAssist query. Wires together everything built so
far in Sprint 3:

  1. safety_router.check_safety()      — circuit breaker, checked FIRST
  2. context_injector.build_resident_context()  — resident-specific data
  3. retriever.retrieve_relevant_resources()    — Ngā Paerewa RAG lookup
  4. prompt_builder.build_messages()   — assembles the final prompt
  5. Groq API call (openai/gpt-oss-120b) — actual generation

If a query is flagged by the safety router, steps 2-5 are skipped entirely
— no resident data is even pulled, no LLM call is made, and the escalation
message is returned directly. This matters for both safety (deterministic,
fast, no dependency on the LLM behaving correctly) and cost (no wasted API
call for something the LLM was never going to be allowed to answer anyway).

Model choice note: Groq deprecated llama-3.3-70b-versatile (announced June
2026) along with the rest of their Llama-branded chat lineup. This uses
openai/gpt-oss-120b, Groq's recommended flagship replacement — still an
open-weight model served on Groq's fast inference infrastructure, not
Claude/OpenAI's own hosted API.

Streaming: generate_response_stream() yields NDJSON lines (one JSON object
per line) so the frontend can display tokens as they arrive instead of
waiting for the full ~500-800 token response. Line types:
  {"type": "chunk", "text": "..."}          — one piece of generated text
  {"type": "done", "response": "...", ...}  — final full text + metadata
The non-streaming generate_response() is kept for any non-HTTP callers
(e.g. scripts, tests) that just want a single return value.

Usage (called from main.py):
    from careassist.generator import generate_response_stream
    for line in generate_response_stream(query, resident_id, db):
        ...
"""

import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from groq import Groq
from sqlalchemy.orm import Session

from careassist import safety_router, context_injector, retriever, prompt_builder

load_dotenv()

MODEL_NAME = "openai/gpt-oss-120b"
N_RETRIEVED_RESOURCES = 3
MAX_TOKENS = 500  # lowered from 800 — shorter worst-case wait, still enough for a full answer

_groq_client = None


def _get_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY not set. Add it to backend/.env as GROQ_API_KEY=your_key_here"
            )
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def _build_done_payload(response_text, escalated, escalation_category, sources, model, timestamp, error=None):
    payload = {
        "type": "done",
        "response": response_text,
        "escalated": escalated,
        "escalation_category": escalation_category,
        "sources": sources,
        "model": model,
        "timestamp": timestamp,
    }
    if error is not None:
        payload["error"] = error
    return payload


def generate_response_stream(query: str, resident_id: int, db: Session):
    """Generator yielding NDJSON lines (see module docstring). Safety check
    runs first and, if triggered, yields a single 'done' line immediately —
    no resident data pulled, no LLM call made."""
    timestamp = datetime.now(timezone.utc).isoformat()

    safety_result = safety_router.check_safety(query)
    if safety_result["escalate"]:
        yield json.dumps(_build_done_payload(
            safety_result["message"], True, safety_result["category"], [], None, timestamp,
        )) + "\n"
        return

    resident_context = context_injector.build_resident_context(resident_id, db)
    retrieved_resources = retriever.retrieve_relevant_resources(query, n_results=N_RETRIEVED_RESOURCES)
    messages = prompt_builder.build_messages(query, resident_context, retrieved_resources)
    sources = [{"title": r["category_title"], "url": r["url"]} for r in retrieved_resources]

    full_text = ""
    try:
        client = _get_client()
        stream = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.3,
            max_tokens=MAX_TOKENS,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                full_text += delta
                yield json.dumps({"type": "chunk", "text": delta}) + "\n"
    except Exception as e:
        yield json.dumps(_build_done_payload(
            "CareAssist couldn't generate a response right now due to a technical issue. "
            "Please try again, or consult the relevant guidance directly.",
            False, None, sources, MODEL_NAME, timestamp, error=str(e),
        )) + "\n"
        return

    yield json.dumps(_build_done_payload(
        full_text, False, None, sources, MODEL_NAME, timestamp,
    )) + "\n"


def generate_response(query: str, resident_id: int, db: Session) -> dict:
    """Non-streaming convenience wrapper — consumes generate_response_stream()
    fully and returns a single combined dict, matching the original Step 3.6
    interface. Useful for scripts/tests that don't need incremental output."""
    full_content = ""
    final = None
    for line in generate_response_stream(query, resident_id, db):
        parsed = json.loads(line)
        if parsed["type"] == "chunk":
            full_content += parsed["text"]
        elif parsed["type"] == "done":
            final = parsed

    return {
        "resident_id": resident_id,
        "query": query,
        "response": final["response"],
        "escalated": final["escalated"],
        "escalation_category": final["escalation_category"],
        "sources": final["sources"],
        "model": final["model"],
        "timestamp": final["timestamp"],
        **({"error": final["error"]} if "error" in final else {}),
    }