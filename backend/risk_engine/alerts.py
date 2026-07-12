"""
alerts.py — Sprint 1, Step 1.6
Aged Care PMS — Clinical Risk Engine

Core logic for GET /risk-alerts.

Scans all active (non-discharged) residents, runs inference for each via
inference.get_risk_score(), and returns those currently at medium or high
risk (probability >= 0.4) — matching the same risk_level categorization
already shown on each resident's individual risk-score endpoint. Intended
to be polled every ~60 seconds by the nurse dashboard.

Threshold choice: uses the risk_level buckets (medium/high) from inference.py
rather than threshold.json's F1-optimized cutoff (0.69). For a clinical
deterioration-alert use case, missing a truly at-risk resident is costlier
than an extra check on a stable one, so a more sensitive (lower) threshold
is appropriate here — an F1-balanced cutoff optimizes for a different, more
symmetric cost tradeoff. This also keeps "risk" meaning the same thing
across both endpoints, rather than introducing a second, disconnected
cutoff. To switch to the stricter F1 threshold instead, replace the
risk_level check below with: result["risk_probability"] >= threshold_config["threshold"]
"""

from sqlalchemy.orm import Session

from resident_models import Resident
from risk_engine import inference

def get_risk_alerts(db: Session) -> list:
    """Returns a list of {resident_id, full_name, risk_probability, risk_level,
    trend} dicts for every active resident currently at medium or high risk,
    sorted highest-risk first."""
    active_residents = db.query(Resident).filter(Resident.discharge_date == None).all()

    alerts = []
    for resident in active_residents:
        result = inference.get_risk_score(resident.id, db)

        # Residents with no vitals yet return risk_level "unknown" — skip them,
        # there's nothing to alert on.
        if result.get("risk_level") not in ("medium", "high"):
            continue

        alerts.append({
            "resident_id": resident.id,
            "full_name": resident.full_name,
            "risk_probability": result["risk_probability"],
            "risk_level": result["risk_level"],
            "trend": result.get("trend"),
        })

    alerts.sort(key=lambda a: a["risk_probability"], reverse=True)
    return alerts