"""
safety_router.py — Sprint 3, Step 3.5 (part 1)
Aged Care PMS — CareAssist RAG Foundation

Checks an incoming query BEFORE any AI generation happens, to catch
situations where a human needs to act immediately rather than wait for (or
rely on) an AI-generated response. This runs first, deterministically —
not itself an LLM call — because a safety gate should be transparent,
predictable, and not dependent on the AI correctly judging when not to
trust itself.

Categories:
- medical_emergency: signs of an acute, physically urgent situation
  (chest pain, can't breathe, unresponsive, etc.) — these need emergency
  services or immediate clinical attention, not a chat response.
- prescribing_decision: requests for a specific dose/medication change —
  this is a prescribing decision, outside CareAssist's scope regardless of
  how confident a generated answer might sound.
- end_of_life: DNR, resuscitation, and end-of-life treatment decisions —
  always require the resident's actual clinical team, never an AI opinion.
- safeguarding: suspected abuse or neglect — has its own mandatory
  reporting obligations that must go through proper channels, not a chatbot.

Deliberately conservative: keyword matching will produce some false
positives (flagging things that turn out to be fine) but that's the
correct failure direction for a safety gate — an unnecessary escalation
costs a moment of a nurse's time, a missed escalation could cost a life.

Usage:
    from careassist.safety_router import check_safety
    result = check_safety(query_text)
    if result["escalate"]:
        # return result["message"] directly, skip AI generation entirely
"""

import re

EMERGENCY_PATTERNS = [
    r"\bchest pain\b",
    r"\bcan'?t breathe\b",
    r"\bcannot breathe\b",
    r"\bdifficulty breathing\b",
    r"\bnot breathing\b",
    r"\bunresponsive\b",
    r"\bunconscious\b",
    r"\bsevere bleeding\b",
    r"\bheavy bleeding\b",
    r"\bchoking\b",
    r"\bseizure\b",
    r"\bstroke\b",
    r"\bface (is )?drooping\b",
    r"\bslurred speech\b",
    r"\banaphylaxis\b",
    r"\ballergic reaction\b",
    r"\bcardiac arrest\b",
    r"\boverdose\b",
    r"\bsuicidal?\b",
    r"\bself.harm\b",
    r"\bnot responding\b",
    r"\bcollapsed\b",
    r"\bfell and (won'?t|can'?t) (get up|move)\b",
]

PRESCRIBING_PATTERNS = [
    r"\bwhat dos(e|age)\b",
    r"\bhow much (medication|dose|dosage)\b",
    r"\b(increase|decrease|change|adjust)\b[^.?!]{0,40}\bdos(e|age)\b",
    r"\bshould (i|we) (prescribe|stop|start|change)\b",
    r"\bdiscontinue\b[^.?!]{0,40}\bmedication\b",
    r"\bstop\b[^.?!]{0,40}\bmedication\b",
]

END_OF_LIFE_PATTERNS = [
    r"\bdnr\b",
    r"\bdo not resuscitate\b",
    r"\bresuscitat\w*\b",
    r"\bwithdraw treatment\b",
    r"\bend.of.life decision\b",
    r"\bpalliative decision\b",
]

SAFEGUARDING_PATTERNS = [
    r"\bsuspect(ed)? abuse\b",
    r"\bbeing abused\b",
    r"\bsuspect(ed)? neglect\b",
    r"\bsafeguarding concern\b",
    r"\belder abuse\b",
]

CATEGORY_MESSAGES = {
    "medical_emergency": (
        "This looks like it may describe an urgent medical situation. "
        "CareAssist does not handle emergencies — call emergency services "
        "(111) or follow your facility's emergency protocol immediately, "
        "and alert the on-duty clinician."
    ),
    "prescribing_decision": (
        "This is a prescribing/medication-change decision, which is outside "
        "CareAssist's scope regardless of how the question is phrased. "
        "Please consult the resident's prescribing clinician or pharmacist."
    ),
    "end_of_life": (
        "End-of-life and resuscitation decisions must be made by the "
        "resident's clinical team in line with their care plan and any "
        "advance directives — not by CareAssist. Please escalate to a "
        "clinician."
    ),
    "safeguarding": (
        "This may describe a safeguarding concern. Please follow your "
        "facility's safeguarding/mandatory reporting procedure and escalate "
        "to a manager or clinician immediately — this should not be handled "
        "through CareAssist."
    ),
}

_CATEGORY_PATTERNS = [
    ("medical_emergency", EMERGENCY_PATTERNS),
    ("end_of_life", END_OF_LIFE_PATTERNS),
    ("safeguarding", SAFEGUARDING_PATTERNS),
    ("prescribing_decision", PRESCRIBING_PATTERNS),
]


def check_safety(query: str) -> dict:
    """Returns {"escalate": bool, "category": str|None, "message": str|None}.
    Checks categories in a fixed priority order (medical emergencies checked
    first) — if a query matches multiple categories, the more urgent one wins."""
    query_lower = query.lower()

    for category, patterns in _CATEGORY_PATTERNS:
        for pattern in patterns:
            if re.search(pattern, query_lower):
                return {
                    "escalate": True,
                    "category": category,
                    "message": CATEGORY_MESSAGES[category],
                }

    return {"escalate": False, "category": None, "message": None}