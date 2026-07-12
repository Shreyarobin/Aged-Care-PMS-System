"""
train.py — Sprint 1, Step 1.3
Aged Care PMS — Clinical Risk Engine

Trains an XGBoost classifier on processed_data.csv (from prepare_data.py).

Compares two ways of handling the severe class imbalance (2.17% positive rows):
  A) scale_pos_weight — XGBoost's native handling, weights positive-class
     gradient/hessian contributions by neg/pos ratio.
  B) sample_weight — sklearn-style class_weight='balanced' equivalent, computed
     manually and passed as per-row sample weights to .fit().

Uses GroupKFold on patient_id (NOT plain KFold) — this is important: rows are
patient-hours, so a random split could put the same patient's hours in both
train and test, leaking patient-specific baseline vitals across the split and
inflating the apparent score. GroupKFold guarantees each patient appears in
exactly one fold.

Output: model.joblib, threshold.json, feature_names.json (rewritten with model_version)

Usage:
    python train.py --input_csv "risk_engine/processed_data.csv" --output_dir "risk_engine"
"""

import argparse
import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from sklearn.metrics import roc_auc_score, average_precision_score, f1_score
import xgboost as xgb

FEATURE_COLS = [
    "hr_mean", "hr_std", "hr_max", "hr_min", "hr_trend",
    "sbp_mean", "sbp_std", "sbp_min",
    "dbp_mean", "dbp_std",
    "spo2_mean", "spo2_min", "spo2_trend",
    "temp_mean", "temp_max", "temp_trend",
    "resp_mean", "resp_std", "resp_max", "resp_min", "resp_trend",
    "frac_missing_hr", "frac_missing_sbp", "frac_missing_dbp",
    "frac_missing_spo2", "frac_missing_temp", "frac_missing_resp",
    "hours_of_data",
]
LABEL_COL = "sepsis_label"
GROUP_COL = "patient_id"
N_FOLDS = 5
MODEL_VERSION = "1.0.0"


def make_sample_weights(y: np.ndarray) -> np.ndarray:
    """sklearn class_weight='balanced' formula: n_samples / (n_classes * n_samples_for_class)."""
    n_samples = len(y)
    n_classes = 2
    weights = np.zeros(n_samples, dtype=float)
    for cls in [0, 1]:
        mask = (y == cls)
        n_cls = mask.sum()
        if n_cls == 0:
            continue
        weights[mask] = n_samples / (n_classes * n_cls)
    return weights


def run_cv(X: pd.DataFrame, y: np.ndarray, groups: pd.Series, method: str) -> dict:
    """Runs GroupKFold CV for the given imbalance-handling method.
    Returns per-fold and mean AUROC/AUPRC, plus out-of-fold predictions for threshold calibration."""
    gkf = GroupKFold(n_splits=N_FOLDS)
    aurocs, auprcs = [], []
    oof_pred = np.zeros(len(y))

    for fold, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups)):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        if method == "scale_pos_weight":
            n_pos = y_train.sum()
            n_neg = len(y_train) - n_pos
            spw = n_neg / n_pos if n_pos > 0 else 1.0
            model = xgb.XGBClassifier(
                n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                scale_pos_weight=spw, eval_metric="auc",
                random_state=42,
            )
            model.fit(X_train, y_train)
        else:  # sample_weight
            sw = make_sample_weights(y_train)
            model = xgb.XGBClassifier(
                n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                eval_metric="auc", random_state=42,
            )
            model.fit(X_train, y_train, sample_weight=sw)

        proba = model.predict_proba(X_test)[:, 1]
        oof_pred[test_idx] = proba

        auroc = roc_auc_score(y_test, proba)
        auprc = average_precision_score(y_test, proba)
        aurocs.append(auroc)
        auprcs.append(auprc)
        print(f"    [{method}] fold {fold + 1}/{N_FOLDS}: AUROC={auroc:.4f}  AUPRC={auprc:.4f}")

    return {
        "mean_auroc": float(np.mean(aurocs)),
        "mean_auprc": float(np.mean(auprcs)),
        "fold_aurocs": aurocs,
        "fold_auprcs": auprcs,
        "oof_pred": oof_pred,
    }


def calibrate_threshold(y: np.ndarray, oof_pred: np.ndarray) -> float:
    """Sweeps candidate thresholds and picks the one maximizing F1 on out-of-fold predictions."""
    best_thresh, best_f1 = 0.5, -1.0
    for thresh in np.arange(0.05, 0.95, 0.01):
        preds = (oof_pred >= thresh).astype(int)
        f1 = f1_score(y, preds, zero_division=0)
        if f1 > best_f1:
            best_f1, best_thresh = f1, thresh
    return float(best_thresh), float(best_f1)


def main():
    parser = argparse.ArgumentParser(description="Train baseline XGBoost risk model with GroupKFold CV.")
    parser.add_argument("--input_csv", required=True, help="Path to processed_data.csv from prepare_data.py")
    parser.add_argument("--output_dir", default=".", help="Where to write model.joblib, threshold.json, feature_names.json")
    args = parser.parse_args()

    print(f"Loading {args.input_csv} ...")
    df = pd.read_csv(args.input_csv)
    X = df[FEATURE_COLS]
    y = df[LABEL_COL].to_numpy()
    groups = df[GROUP_COL]

    n_patients = groups.nunique()
    print(f"Loaded {len(df)} rows across {n_patients} patients. Positive rate: {100*y.mean():.2f}%\n")

    print("Running GroupKFold CV — method A: scale_pos_weight")
    result_spw = run_cv(X, y, groups, "scale_pos_weight")
    print(f"  Mean AUROC: {result_spw['mean_auroc']:.4f}   Mean AUPRC: {result_spw['mean_auprc']:.4f}\n")

    print("Running GroupKFold CV — method B: sample_weight (balanced)")
    result_sw = run_cv(X, y, groups, "sample_weight")
    print(f"  Mean AUROC: {result_sw['mean_auroc']:.4f}   Mean AUPRC: {result_sw['mean_auprc']:.4f}\n")

    print("=" * 60)
    print(f"{'Method':<25}{'Mean AUROC':<15}{'Mean AUPRC':<15}")
    print(f"{'scale_pos_weight':<25}{result_spw['mean_auroc']:<15.4f}{result_spw['mean_auprc']:<15.4f}")
    print(f"{'sample_weight':<25}{result_sw['mean_auroc']:<15.4f}{result_sw['mean_auprc']:<15.4f}")
    print("=" * 60)

    if (result_spw["mean_auroc"], result_spw["mean_auprc"]) >= (result_sw["mean_auroc"], result_sw["mean_auprc"]):
        winner, winner_name = result_spw, "scale_pos_weight"
    else:
        winner, winner_name = result_sw, "sample_weight"
    print(f"\nWinner: {winner_name} (higher mean AUROC)")

    threshold, threshold_f1 = calibrate_threshold(y, winner["oof_pred"])
    print(f"Calibrated alert threshold (max F1 on OOF predictions): {threshold:.2f} (F1={threshold_f1:.4f})")

    print(f"\nTraining final model on full dataset using '{winner_name}'...")
    if winner_name == "scale_pos_weight":
        n_pos, n_neg = y.sum(), len(y) - y.sum()
        spw = n_neg / n_pos if n_pos > 0 else 1.0
        final_model = xgb.XGBClassifier(
            n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=spw, eval_metric="auc",
            random_state=42,
        )
        final_model.fit(X, y)
    else:
        sw = make_sample_weights(y)
        final_model = xgb.XGBClassifier(
            n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
            eval_metric="auc", random_state=42,
        )
        final_model.fit(X, y, sample_weight=sw)

    os.makedirs(args.output_dir, exist_ok=True)

    model_path = os.path.join(args.output_dir, "model.joblib")
    joblib.dump(final_model, model_path)
    print(f"Saved: {model_path}")

    threshold_path = os.path.join(args.output_dir, "threshold.json")
    with open(threshold_path, "w") as f:
        json.dump({
            "threshold": threshold,
            "threshold_f1": threshold_f1,
            "risk_levels": {"low": "<0.4", "medium": "0.4-0.6", "high": ">0.6"},
            "imbalance_method": winner_name,
            "cv_mean_auroc": winner["mean_auroc"],
            "cv_mean_auprc": winner["mean_auprc"],
        }, f, indent=2)
    print(f"Saved: {threshold_path}")

    feature_names_path = os.path.join(args.output_dir, "feature_names.json")
    with open(feature_names_path, "w") as f:
        json.dump({
            "feature_columns": FEATURE_COLS,
            "label_column": LABEL_COL,
            "model_version": MODEL_VERSION,
            "imbalance_method": winner_name,
        }, f, indent=2)
    print(f"Saved: {feature_names_path}")

    target_met = "YES" if winner["mean_auroc"] > 0.76 else "NOT YET"
    print(f"\nTarget AUROC >0.76: {target_met} (achieved {winner['mean_auroc']:.4f})")


if __name__ == "__main__":
    main()