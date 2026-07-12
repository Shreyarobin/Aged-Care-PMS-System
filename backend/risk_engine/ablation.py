"""
ablation.py — Sprint 1, Step 1.4
Aged Care PMS — Clinical Risk Engine

Compares a vitals-only model against a vitals + SYNTHETIC frailty-proxy model.

IMPORTANT — methodological note:
PhysioNet 2019 has no frailty assessment data at all (no InterRAI, no
frailty_index, falls_risk, or adl_hierarchy — those are ASTRA/InterRAI-
specific fields collected in the real PMS, not part of this public ICU
dataset). This script therefore builds a SYNTHETIC proxy frailty score from
what PhysioNet does provide: patient age (from age_lookup.csv, produced by
add_age.py) and a physiological-instability composite (variability across
HR/SBP/DBP/Resp, already computed in processed_data.csv as *_std columns).
Age and reduced physiological reserve are both well-established correlates
of frailty in geriatric/ICU literature, making this a reasonable stand-in —
but it is NOT real InterRAI frailty data. This ablation should be re-run
against real frailty_index/falls_risk/adl_hierarchy once enough ASTRA
residents have InterRAI assessments recorded in production.

Output: ablation_results.json

Usage:
    python ablation.py --input_csv "risk_engine\\processed_data.csv" --age_csv "risk_engine\\age_lookup.csv" --output_dir "risk_engine"
"""

import argparse
import json
import os

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from sklearn.metrics import roc_auc_score, average_precision_score, f1_score
import xgboost as xgb

VITALS_FEATURE_COLS = [
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


def build_frailty_proxy(df: pd.DataFrame) -> pd.Series:
    """SYNTHETIC frailty proxy: 0.5 * normalized age + 0.5 * physiological-
    instability composite (mean of min-max normalized hr_std, sbp_std,
    dbp_std, resp_std). Scaled to [0, 1] to mirror the real InterRAI
    frailty_index's normalization convention, but this is NOT real
    clinical frailty data — see module docstring."""
    age_range = df["age"].max() - df["age"].min()
    age_norm = (df["age"] - df["age"].min()) / (age_range + 1e-9)

    instability_cols = ["hr_std", "sbp_std", "dbp_std", "resp_std"]
    norm_instab = pd.DataFrame(index=df.index)
    for col in instability_cols:
        col_range = df[col].max() - df[col].min()
        norm_instab[col] = (df[col] - df[col].min()) / (col_range + 1e-9)
    instability_composite = norm_instab.mean(axis=1)

    frailty_proxy = 0.5 * age_norm + 0.5 * instability_composite
    return frailty_proxy.clip(0, 1)


def run_cv(X: pd.DataFrame, y: np.ndarray, groups: pd.Series) -> dict:
    """GroupKFold CV, same hyperparameters as train.py's winning config, so the
    only thing that differs between the two models compared here is the
    feature set — not model capacity or tuning."""
    gkf = GroupKFold(n_splits=N_FOLDS)
    aurocs, auprcs, f1s = [], [], []
    skipped_folds = 0

    for fold, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups)):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        n_pos, n_neg = y_train.sum(), len(y_train) - y_train.sum()
        spw = n_neg / n_pos if n_pos > 0 else 1.0

        model = xgb.XGBClassifier(
            n_estimators=400, max_depth=5, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=spw, eval_metric="auc", random_state=42,
        )
        model.fit(X_train, y_train)
        proba = model.predict_proba(X_test)[:, 1]

        if len(np.unique(y_test)) < 2:
            skipped_folds += 1
            print(f"    fold {fold + 1}/{N_FOLDS}: SKIPPED (test fold has only one class present)")
            continue

        auroc = roc_auc_score(y_test, proba)
        auprc = average_precision_score(y_test, proba)
        preds_at_half = (proba >= 0.5).astype(int)
        f1 = f1_score(y_test, preds_at_half, zero_division=0)

        aurocs.append(auroc)
        auprcs.append(auprc)
        f1s.append(f1)
        print(f"    fold {fold + 1}/{N_FOLDS}: AUROC={auroc:.4f}  AUPRC={auprc:.4f}  F1@0.5={f1:.4f}")

    if skipped_folds:
        print(f"    ({skipped_folds}/{N_FOLDS} folds skipped due to single-class test data)")

    return {
        "mean_auroc": float(np.mean(aurocs)) if aurocs else float("nan"),
        "mean_auprc": float(np.mean(auprcs)) if auprcs else float("nan"),
        "mean_f1_at_0.5": float(np.mean(f1s)) if f1s else float("nan"),
        "fold_aurocs": aurocs,
        "folds_used": len(aurocs),
    }


def main():
    parser = argparse.ArgumentParser(description="Frailty-adjusted ablation study (vitals-only vs vitals+synthetic-frailty-proxy).")
    parser.add_argument("--input_csv", required=True, help="Path to processed_data.csv from prepare_data.py")
    parser.add_argument("--age_csv", required=True, help="Path to age_lookup.csv from add_age.py")
    parser.add_argument("--output_dir", default=".", help="Where to write ablation_results.json")
    args = parser.parse_args()

    print(f"Loading {args.input_csv} ...")
    df = pd.read_csv(args.input_csv)

    print(f"Loading {args.age_csv} ...")
    age_df = pd.read_csv(args.age_csv)
    df = df.merge(age_df, on="patient_id", how="left")
    if df["age"].isna().any():
        median_age = df["age"].median()
        n_missing = int(df["age"].isna().sum())
        df["age"] = df["age"].fillna(median_age)
        print(f"Filled {n_missing} rows with missing merged age (median={median_age:.1f})")

    print("Building synthetic frailty proxy (age + physiological instability)...")
    df["frailty_proxy"] = build_frailty_proxy(df)

    y = df[LABEL_COL].to_numpy()
    groups = df[GROUP_COL]

    print(f"\n{len(df)} rows, {groups.nunique()} patients, positive rate {100 * y.mean():.2f}%\n")

    print("=" * 60)
    print("Model A: VITALS-ONLY")
    print("=" * 60)
    X_vitals = df[VITALS_FEATURE_COLS]
    result_vitals = run_cv(X_vitals, y, groups)
    print(f"  Mean AUROC: {result_vitals['mean_auroc']:.4f}   Mean AUPRC: {result_vitals['mean_auprc']:.4f}\n")

    print("=" * 60)
    print("Model B: VITALS + SYNTHETIC FRAILTY PROXY")
    print("=" * 60)
    X_frailty = df[VITALS_FEATURE_COLS + ["frailty_proxy"]]
    result_frailty = run_cv(X_frailty, y, groups)
    print(f"  Mean AUROC: {result_frailty['mean_auroc']:.4f}   Mean AUPRC: {result_frailty['mean_auprc']:.4f}\n")

    delta_auroc = result_frailty["mean_auroc"] - result_vitals["mean_auroc"]
    delta_auprc = result_frailty["mean_auprc"] - result_vitals["mean_auprc"]

    print("=" * 60)
    print(f"{'Model':<35}{'Mean AUROC':<15}{'Mean AUPRC':<15}")
    print(f"{'Vitals-only':<35}{result_vitals['mean_auroc']:<15.4f}{result_vitals['mean_auprc']:<15.4f}")
    print(f"{'Vitals + synthetic frailty proxy':<35}{result_frailty['mean_auroc']:<15.4f}{result_frailty['mean_auprc']:<15.4f}")
    print(f"\nDelta AUROC: {delta_auroc:+.4f}   Delta AUPRC: {delta_auprc:+.4f}")
    print("=" * 60)

    os.makedirs(args.output_dir, exist_ok=True)
    results_path = os.path.join(args.output_dir, "ablation_results.json")
    with open(results_path, "w") as f:
        json.dump({
            "methodology_note": (
                "frailty_proxy is a SYNTHETIC stand-in (0.5*normalized_age + "
                "0.5*physiological_instability_composite), constructed because "
                "PhysioNet 2019 contains no real InterRAI frailty assessment data. "
                "This ablation should be re-validated against real "
                "frailty_index/falls_risk/adl_hierarchy once sufficient ASTRA "
                "resident InterRAI data exists in production."
            ),
            "vitals_only": result_vitals,
            "vitals_plus_frailty_proxy": result_frailty,
            "delta_auroc": delta_auroc,
            "delta_auprc": delta_auprc,
        }, f, indent=2)
    print(f"Saved: {results_path}")


if __name__ == "__main__":
    main()