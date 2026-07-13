"""
generator.py — Sprint 3, Step 3.6
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

Usage (called from main.py):
    from careassist.generator import generate_response
    result = generate_response(query, resident_id, db)
"""

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from groq import Groq
from sqlalchemy.orm import Session

from careassist import safety_router, context_injector, retriever, prompt_builder

load_dotenv()

MODEL_NAME = "openai/gpt-oss-120b"
N_RETRIEVED_RESOURCES = 3

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


def generate_response(query: str, resident_id: int, db: Session) -> dict:
    """Main entry point. Returns a dict with at minimum: resident_id, query,
    response, escalated, timestamp. If escalated is True, `response` is the
    safety router's escalation message and no LLM call was made."""
    timestamp = datetime.now(timezone.utc).isoformat()

    safety_result = safety_router.check_safety(query)
    if safety_result["escalate"]:
        return {
            "resident_id": resident_id,
            "query": query,
            "response": safety_result["message"],
            "escalated": True,
            "escalation_category": safety_result["category"],
            "sources": [],
            "model": None,
            "timestamp": timestamp,
        }

    resident_context = context_injector.build_resident_context(resident_id, db)
    retrieved_resources = retriever.retrieve_relevant_resources(query, n_results=N_RETRIEVED_RESOURCES)
    messages = prompt_builder.build_messages(query, resident_context, retrieved_resources)

    try:
        client = _get_client()
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.3,  # lower temperature: clinical decision-support context favors
                               # consistent, grounded answers over creative variation
            max_tokens=800,
        )
        response_text = completion.choices[0].message.content
    except Exception as e:
        return {
            "resident_id": resident_id,
            "query": query,
            "response": (
                "CareAssist couldn't generate a response right now due to a technical "
                "issue. Please try again, or consult the relevant guidance directly."
            ),
            "escalated": False,
            "escalation_category": None,
            "sources": [
                {"title": r["category_title"], "url": r["url"]} for r in retrieved_resources
            ],
            "model": MODEL_NAME,
            "error": str(e),
            "timestamp": timestamp,
        }

    return {
        "resident_id": resident_id,
        "query": query,
        "response": response_text,
        "escalated": False,
        "escalation_category": None,
        "sources": [
            {"title": r["category_title"], "url": r["url"]} for r in retrieved_resources
        ],
        "model": MODEL_NAME,
        "timestamp": timestamp,
    }