"""
inference.py — Sprint 1, Step 1.5
Aged Care PMS — Clinical Risk Engine

Core logic for GET /residents/{resident_id}/risk-score.

Loads the trained model/artifacts once, then for each request:
1. Pulls the resident's last 12 vitals readings (oldest to newest)
2. Rebuilds the EXACT feature set used in training (prepare_data.py):
   rolling mean/std/max/min/trend per vital, missingness fractions, hours_of_data
3. Forward-fills within the window (same as training), then fills any still-
   missing features with the SAVED training-set means (impute_means.json) —
   not a mean recomputed on the fly — so serving matches training exactly
4. Runs the model, buckets probability into risk_level, derives a simple
   trend label, and ranks contributing factors

Note on contributing factors: this uses (feature importance x deviation from
training mean) as a lightweight, dependency-free approximation. It is NOT
SHAP — genuine per-prediction SHAP values would be more rigorous and are a
natural v2 upgrade (see AI_Roadmap.md), but require adding the shap package
and are noticeably slower per-request; this v1 approach needs nothing beyond
the model itself and is fast enough for a live "called every few seconds"
dashboard use case.

Note on frailty: this model is VITALS-ONLY. The ablation study (ablation.py)
found no benefit from a synthetic frailty proxy, so it was deliberately left
out of the production model. frailty_adjusted is therefore always False.
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from vitals_models import VitalsReading

RISK_ENGINE_DIR = os.path.dirname(__file__)
WINDOW_SIZE = 12
TREND_WINDOW = 6

_model = None
_feature_names = None
_threshold_config = None
_impute_means = None


def _load_artifacts():
    """Loads model + metadata once, on first use, rather than per-request."""
    global _model, _feature_names, _threshold_config, _impute_means
    if _model is not None:
        return
    _model = joblib.load(os.path.join(RISK_ENGINE_DIR, "model.joblib"))
    with open(os.path.join(RISK_ENGINE_DIR, "feature_names.json")) as f:
        _feature_names = json.load(f)
    with open(os.path.join(RISK_ENGINE_DIR, "threshold.json")) as f:
        _threshold_config = json.load(f)
    with open(os.path.join(RISK_ENGINE_DIR, "impute_means.json")) as f:
        _impute_means = json.load(f)


def _slope(values: np.ndarray) -> float:
    """Same as prepare_data.py's _slope: least-squares slope, 0.0 if <2 points."""
    mask = ~np.isnan(values)
    if mask.sum() < 2:
        return 0.0
    x = np.arange(len(values))[mask]
    y = values[mask]
    slope, _intercept = np.polyfit(x, y, 1)
    return float(slope)


def _ffill(arr: np.ndarray) -> np.ndarray:
    return pd.Series(arr).ffill().to_numpy()


def _build_features_from_readings(readings: list) -> dict:
    """readings: VitalsReading ORM objects, chronological order (oldest first),
    at most WINDOW_SIZE of them. Mirrors prepare_data.py's engineer_patient_features
    for a single (the most recent) hour, since that's all the live endpoint needs."""
    hr = np.array([r.heart_rate for r in readings], dtype=float)
    sbp = np.array([r.blood_pressure_systolic for r in readings], dtype=float)
    dbp = np.array([r.blood_pressure_diastolic for r in readings], dtype=float)
    spo2 = np.array([r.spo2 for r in readings], dtype=float)
    temp = np.array([r.temperature for r in readings], dtype=float)
    resp = np.array(
        [r.respiratory_rate if r.respiratory_rate is not None else np.nan for r in readings],
        dtype=float,
    )

    frac_missing_hr = float(np.mean(np.isnan(hr)))
    frac_missing_sbp = float(np.mean(np.isnan(sbp)))
    frac_missing_dbp = float(np.mean(np.isnan(dbp)))
    frac_missing_spo2 = float(np.mean(np.isnan(spo2)))
    frac_missing_temp = float(np.mean(np.isnan(temp)))
    frac_missing_resp = float(np.mean(np.isnan(resp)))

    hr_ff = _ffill(hr)
    sbp_ff = _ffill(sbp)
    dbp_ff = _ffill(dbp)
    spo2_ff = _ffill(spo2)
    temp_ff = _ffill(temp)
    resp_ff = _ffill(resp)

    hours_of_data = int(np.sum(~np.isnan(hr_ff)))

    trend_hr = hr_ff[-TREND_WINDOW:]
    trend_spo2 = spo2_ff[-TREND_WINDOW:]
    trend_temp = temp_ff[-TREND_WINDOW:]
    trend_resp = resp_ff[-TREND_WINDOW:]

    feats = {
        "hr_mean": np.nanmean(hr_ff) if hours_of_data else np.nan,
        "hr_std": np.nanstd(hr_ff) if hours_of_data else np.nan,
        "hr_max": np.nanmax(hr_ff) if hours_of_data else np.nan,
        "hr_min": np.nanmin(hr_ff) if hours_of_data else np.nan,
        "hr_trend": _slope(trend_hr),

        "sbp_mean": np.nanmean(sbp_ff) if np.any(~np.isnan(sbp_ff)) else np.nan,
        "sbp_std": np.nanstd(sbp_ff) if np.any(~np.isnan(sbp_ff)) else np.nan,
        "sbp_min": np.nanmin(sbp_ff) if np.any(~np.isnan(sbp_ff)) else np.nan,

        "dbp_mean": np.nanmean(dbp_ff) if np.any(~np.isnan(dbp_ff)) else np.nan,
        "dbp_std": np.nanstd(dbp_ff) if np.any(~np.isnan(dbp_ff)) else np.nan,

        "spo2_mean": np.nanmean(spo2_ff) if np.any(~np.isnan(spo2_ff)) else np.nan,
        "spo2_min": np.nanmin(spo2_ff) if np.any(~np.isnan(spo2_ff)) else np.nan,
        "spo2_trend": _slope(trend_spo2),

        "temp_mean": np.nanmean(temp_ff) if np.any(~np.isnan(temp_ff)) else np.nan,
        "temp_max": np.nanmax(temp_ff) if np.any(~np.isnan(temp_ff)) else np.nan,
        "temp_trend": _slope(trend_temp),

        "resp_mean": np.nanmean(resp_ff) if np.any(~np.isnan(resp_ff)) else np.nan,
        "resp_std": np.nanstd(resp_ff) if np.any(~np.isnan(resp_ff)) else np.nan,
        "resp_max": np.nanmax(resp_ff) if np.any(~np.isnan(resp_ff)) else np.nan,
        "resp_min": np.nanmin(resp_ff) if np.any(~np.isnan(resp_ff)) else np.nan,
        "resp_trend": _slope(trend_resp),

        "frac_missing_hr": frac_missing_hr,
        "frac_missing_sbp": frac_missing_sbp,
        "frac_missing_dbp": frac_missing_dbp,
        "frac_missing_spo2": frac_missing_spo2,
        "frac_missing_temp": frac_missing_temp,
        "frac_missing_resp": frac_missing_resp,

        "hours_of_data": hours_of_data,
    }
    return feats


def _risk_level(prob: float) -> str:
    if prob < 0.4:
        return "low"
    elif prob < 0.6:
        return "medium"
    return "high"


def _compute_trend(readings: list) -> str:
    """Compares HR/SpO2 in the second half of the window vs the first half.
    A simple, explainable heuristic — not model-derived — for the plain-
    English 'improving/stable/worsening' label."""
    if len(readings) < 4:
        return "stable"
    hr = np.array([r.heart_rate for r in readings], dtype=float)
    spo2 = np.array([r.spo2 for r in readings], dtype=float)
    mid = len(readings) // 2
    hr_delta = np.nanmean(hr[mid:]) - np.nanmean(hr[:mid])
    spo2_delta = np.nanmean(spo2[mid:]) - np.nanmean(spo2[:mid])

    if hr_delta > 3 or spo2_delta < -1:
        return "worsening"
    if hr_delta < -3 or spo2_delta > 1:
        return "improving"
    return "stable"


def _contributing_factors(feature_row: pd.DataFrame, top_n: int = 3) -> list:
    """Ranks features by (model feature importance x deviation from the
    training-set mean). A lightweight, dependency-free stand-in for SHAP —
    see module docstring."""
    importances = _model.feature_importances_
    feature_cols = _feature_names["feature_columns"]

    factors = []
    for i, col in enumerate(feature_cols):
        value = float(feature_row.iloc[0][col])
        baseline = _impute_means.get(col, 0.0)
        deviation = abs(value - baseline)
        score = float(importances[i]) * deviation
        factors.append({"factor": col, "value": round(value, 2), "score": score})

    factors.sort(key=lambda f: f["score"], reverse=True)
    return [{"factor": f["factor"], "value": f["value"]} for f in factors[:top_n]]


def get_risk_score(resident_id: int, db: Session) -> dict:
    """Main entry point, called by the GET /residents/{resident_id}/risk-score route."""
    _load_artifacts()

    readings = (
        db.query(VitalsReading)
        .filter(VitalsReading.resident_id == resident_id)
        .order_by(VitalsReading.recorded_at.desc())
        .limit(WINDOW_SIZE)
        .all()
    )

    if not readings:
        return {
            "resident_id": resident_id,
            "risk_probability": None,
            "risk_level": "unknown",
            "message": "No vitals readings available for this resident yet.",
            "readings_used": 0,
            "model_version": _feature_names.get("model_version", "1.0.0"),
        }

    readings = list(reversed(readings))

    feats = _build_features_from_readings(readings)

    feature_cols = _feature_names["feature_columns"]
    row = {}
    for col in feature_cols:
        val = feats.get(col, np.nan)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            val = _impute_means.get(col, 0.0)
        row[col] = val

    X = pd.DataFrame([row], columns=feature_cols)

    risk_probability = float(_model.predict_proba(X)[:, 1][0])

    return {
        "resident_id": resident_id,
        "risk_probability": round(risk_probability, 4),
        "risk_level": _risk_level(risk_probability),
        "frailty_adjusted": False,
        "contributing_factors": _contributing_factors(X),
        "trend": _compute_trend(readings),
        "readings_used": len(readings),
        "last_assessed": readings[-1].recorded_at.isoformat(),
        "model_version": _feature_names.get("model_version", "1.0.0"),
    }