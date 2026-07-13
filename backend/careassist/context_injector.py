"""
context_injector.py — Sprint 3, Step 3.3
Aged Care PMS — CareAssist RAG Foundation

Builds a structured, human-readable context block for a single resident,
pulling from care plans, InterRAI assessments, progress notes, active
medications, recent incidents, and — reusing Sprint 1's work — their live
deterioration risk score. This gets prepended to the prompt sent to Claude
in generator.py, so CareAssist's answers are grounded in this specific
resident's actual situation rather than generic advice.

Design notes:
- Missing data (no active care plan, no InterRAI yet, etc.) is handled
  gracefully with "None recorded" rather than crashing — a brand new
  resident with minimal history should still produce a usable context block.
- Progress note content is truncated to keep the context block a reasonable
  size — this feeds into an LLM prompt, so token budget matters, and 5 full
  long notes could otherwise dominate the context.
- The risk score call reuses risk_engine.inference directly rather than
  duplicating any of that logic — if inference.py's feature set or model
  changes, this stays in sync automatically.

Usage (called from main.py, not run standalone):
    from careassist.context_injector import build_resident_context
    context_text = build_resident_context(resident_id, db)
"""

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from resident_models import Resident
from care_plan_models import CarePlan
from interrai_models import InterRAIAssessment
from progress_note_models import ProgressNote
from emar_models import MedicationOrder
from incident_models import Incident
from risk_engine import inference

RECENT_NOTES_LIMIT = 5
RECENT_INCIDENTS_DAYS = 90
NOTE_CONTENT_TRUNCATE = 200


def _calculate_age(date_of_birth: date) -> int:
    today = date.today()
    age = today.year - date_of_birth.year
    if (today.month, today.day) < (date_of_birth.month, date_of_birth.day):
        age -= 1
    return age


def _format_risk_section(resident_id: int, db: Session) -> str:
    try:
        risk = inference.get_risk_score(resident_id, db)
    except Exception:
        return "Current deterioration risk: unavailable (risk engine error)"

    if risk.get("risk_level") == "unknown":
        return "Current deterioration risk: not available (no vitals recorded yet)"

    prob_pct = round(risk["risk_probability"] * 100) if risk.get("risk_probability") is not None else "?"
    trend = risk.get("trend", "unknown")
    return (
        f"Current deterioration risk: {risk['risk_level'].upper()} ({prob_pct}%) "
        f"— trend: {trend} — based on last {risk.get('readings_used', '?')} vitals readings"
    )


def _format_care_plan_section(resident_id: int, db: Session) -> str:
    plan = (
        db.query(CarePlan)
        .filter(CarePlan.resident_id == resident_id, CarePlan.is_active == True)
        .first()
    )
    if not plan:
        return "Active care plan: None recorded"

    lines = [
        "Active care plan:",
        f"  Goals: {plan.goals}",
        f"  Interventions: {plan.interventions}",
    ]
    if plan.review_notes:
        lines.append(f"  Review notes: {plan.review_notes}")
    return "\n".join(lines)


def _format_interrai_section(resident_id: int, db: Session) -> str:
    assessment = (
        db.query(InterRAIAssessment)
        .filter(InterRAIAssessment.resident_id == resident_id)
        .order_by(InterRAIAssessment.assessment_date.desc())
        .first()
    )
    if not assessment:
        return "Latest InterRAI assessment: None recorded"

    return (
        f"Latest InterRAI assessment ({assessment.assessment_date}):\n"
        f"  Frailty index: {assessment.frailty_index:.2f}\n"
        f"  Falls risk: {assessment.falls_risk}/3\n"
        f"  ADL hierarchy: {assessment.adl_hierarchy}/6\n"
        f"  Cognitive performance: {assessment.cognitive_performance}/6\n"
        f"  Mood: {assessment.mood}/3\n"
        f"  Continence: {assessment.continence}/4\n"
        f"  Communication: {assessment.communication}/4"
    )


def _format_medications_section(resident_id: int, db: Session) -> str:
    active_meds = (
        db.query(MedicationOrder)
        .filter(MedicationOrder.resident_id == resident_id, MedicationOrder.is_active == True)
        .all()
    )
    if not active_meds:
        return "Active medications: None recorded"

    lines = ["Active medications:"]
    for med in active_meds:
        lines.append(f"  - {med.medication_name} {med.dosage}, scheduled: {med.scheduled_times}")
    return "\n".join(lines)


def _format_progress_notes_section(resident_id: int, db: Session) -> str:
    notes = (
        db.query(ProgressNote)
        .filter(ProgressNote.resident_id == resident_id)
        .order_by(ProgressNote.written_at.desc())
        .limit(RECENT_NOTES_LIMIT)
        .all()
    )
    if not notes:
        return f"Recent progress notes (last {RECENT_NOTES_LIMIT}): None recorded"

    lines = [f"Recent progress notes (last {RECENT_NOTES_LIMIT}):"]
    for note in notes:
        content = note.content
        if len(content) > NOTE_CONTENT_TRUNCATE:
            content = content[:NOTE_CONTENT_TRUNCATE].rstrip() + "..."
        date_str = note.written_at.strftime("%Y-%m-%d")
        lines.append(f"  [{date_str}, {note.category.value}] {content}")
    return "\n".join(lines)


def _format_incidents_section(resident_id: int, db: Session) -> str:
    cutoff = date.today() - timedelta(days=RECENT_INCIDENTS_DAYS)
    incidents = (
        db.query(Incident)
        .filter(Incident.resident_id == resident_id, Incident.incident_date >= cutoff)
        .order_by(Incident.incident_date.desc())
        .all()
    )
    if not incidents:
        return f"Recent incidents (last {RECENT_INCIDENTS_DAYS} days): None recorded"

    lines = [f"Recent incidents (last {RECENT_INCIDENTS_DAYS} days):"]
    for inc in incidents:
        lines.append(
            f"  [{inc.incident_date}, {inc.incident_type.value}, {inc.severity.value}] {inc.description}"
        )
    return "\n".join(lines)


def build_resident_context(resident_id: int, db: Session) -> str:
    """Main entry point. Returns a formatted text block summarizing this
    resident's current situation, for injection into a CareAssist prompt.
    Returns an error message string (not an exception) if the resident
    doesn't exist, so callers can decide how to handle that themselves."""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        return f"[No resident found with id={resident_id}]"

    age = _calculate_age(resident.date_of_birth)
    status = "Discharged" if resident.discharge_date else "Active resident"

    header = (
        f"=== RESIDENT CONTEXT ===\n"
        f"Name: {resident.full_name} (Age {age})\n"
        f"NHI: {resident.nhi_number}\n"
        f"Funding category: {resident.funding_category.value}\n"
        f"Admitted: {resident.admission_date} ({status})\n"
    )

    sections = [
        _format_risk_section(resident_id, db),
        "",
        _format_care_plan_section(resident_id, db),
        "",
        _format_interrai_section(resident_id, db),
        "",
        _format_medications_section(resident_id, db),
        "",
        _format_progress_notes_section(resident_id, db),
        "",
        _format_incidents_section(resident_id, db),
    ]

    footer = "\n=== END RESIDENT CONTEXT ==="

    return header + "\n" + "\n".join(sections) + footer