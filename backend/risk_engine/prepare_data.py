"""
prepare_data.py — Sprint 1, Step 1.2
Aged Care PMS — Clinical Risk Engine

Reads PhysioNet 2019 Sepsis Challenge training_setA .psv files, and produces
one row per patient per hour, using a causal (backward-looking only) 12-hour
sliding window of vitals. This mirrors how the model will be used in
production: at any given hour, only past readings for that resident are
available, never future ones.

Output: processed_data.csv, feature_names.json

Usage:
    python prepare_data.py --input_dir "C:\\Users\\LENOVO\\Downloads\\physionet2019\\training_setA" --output_dir "."
"""

import argparse
import glob
import json
import os

import numpy as np
import pandas as pd

WINDOW_SIZE = 12          # hours of history considered at each timestep
TREND_WINDOW = 6          # most recent N readings used for trend/slope
VITALS = ["HR", "SBP", "DBP", "O2Sat", "Temp", "Resp"]
KEEP_RAW_COLS = VITALS + ["SepsisLabel"]


def _slope(values: np.ndarray) -> float:
    """Least-squares slope of a 1D array against a simple time index.
    Returns 0.0 if fewer than 2 non-NaN points are available (can't fit a line)."""
    mask = ~np.isnan(values)
    if mask.sum() < 2:
        return 0.0
    x = np.arange(len(values))[mask]
    y = values[mask]
    slope, _intercept = np.polyfit(x, y, 1)
    return float(slope)


def load_patient_file(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, sep="|")
    df = df[KEEP_RAW_COLS].copy()
    return df


def forward_fill_vitals(df: pd.DataFrame) -> pd.DataFrame:
    """Carries the last known vital reading forward in time, per patient."""
    df = df.copy()
    df[VITALS] = df[VITALS].ffill()
    return df


def engineer_patient_features(df: pd.DataFrame, patient_id: str) -> pd.DataFrame:
    """For each hour t in the patient's stay, build a feature row using only
    rows [max(0, t-WINDOW_SIZE+1) ... t] — strictly causal, no future leakage.

    Missingness fractions are computed from the RAW (pre-forward-fill) data,
    since forward-filling would hide how sparsely a vital was actually
    measured — and measurement frequency itself can be informative (sicker
    patients tend to get monitored more closely)."""
    df_raw = df
    df_ff = forward_fill_vitals(df)
    n_hours = len(df_ff)
    rows = []

    for t in range(n_hours):
        start = max(0, t - WINDOW_SIZE + 1)
        window = df_ff.iloc[start:t + 1]
        window_raw = df_raw.iloc[start:t + 1]
        trend_window = df_ff.iloc[max(0, t - TREND_WINDOW + 1):t + 1]

        hr = window["HR"].to_numpy(dtype=float)
        sbp = window["SBP"].to_numpy(dtype=float)
        dbp = window["DBP"].to_numpy(dtype=float)
        spo2 = window["O2Sat"].to_numpy(dtype=float)
        temp = window["Temp"].to_numpy(dtype=float)
        resp = window["Resp"].to_numpy(dtype=float)

        hr_trend_vals = trend_window["HR"].to_numpy(dtype=float)
        spo2_trend_vals = trend_window["O2Sat"].to_numpy(dtype=float)
        temp_trend_vals = trend_window["Temp"].to_numpy(dtype=float)
        resp_trend_vals = trend_window["Resp"].to_numpy(dtype=float)

        hours_of_data = int(np.sum(~np.isnan(hr)))

        row = {
            "patient_id": patient_id,
            "hour": t + 1,
            "hours_of_data": hours_of_data,

            "hr_mean": np.nanmean(hr) if hours_of_data else np.nan,
            "hr_std": np.nanstd(hr) if hours_of_data else np.nan,
            "hr_max": np.nanmax(hr) if hours_of_data else np.nan,
            "hr_min": np.nanmin(hr) if hours_of_data else np.nan,
            "hr_trend": _slope(hr_trend_vals),

            "sbp_mean": np.nanmean(sbp) if np.any(~np.isnan(sbp)) else np.nan,
            "sbp_std": np.nanstd(sbp) if np.any(~np.isnan(sbp)) else np.nan,
            "sbp_min": np.nanmin(sbp) if np.any(~np.isnan(sbp)) else np.nan,

            "dbp_mean": np.nanmean(dbp) if np.any(~np.isnan(dbp)) else np.nan,
            "dbp_std": np.nanstd(dbp) if np.any(~np.isnan(dbp)) else np.nan,

            "spo2_mean": np.nanmean(spo2) if np.any(~np.isnan(spo2)) else np.nan,
            "spo2_min": np.nanmin(spo2) if np.any(~np.isnan(spo2)) else np.nan,
            "spo2_trend": _slope(spo2_trend_vals),

            "temp_mean": np.nanmean(temp) if np.any(~np.isnan(temp)) else np.nan,
            "temp_max": np.nanmax(temp) if np.any(~np.isnan(temp)) else np.nan,
            "temp_trend": _slope(temp_trend_vals),

            "resp_mean": np.nanmean(resp) if np.any(~np.isnan(resp)) else np.nan,
            "resp_std": np.nanstd(resp) if np.any(~np.isnan(resp)) else np.nan,
            "resp_max": np.nanmax(resp) if np.any(~np.isnan(resp)) else np.nan,
            "resp_min": np.nanmin(resp) if np.any(~np.isnan(resp)) else np.nan,
            "resp_trend": _slope(resp_trend_vals),

            "frac_missing_hr": float(window_raw["HR"].isna().mean()),
            "frac_missing_sbp": float(window_raw["SBP"].isna().mean()),
            "frac_missing_dbp": float(window_raw["DBP"].isna().mean()),
            "frac_missing_spo2": float(window_raw["O2Sat"].isna().mean()),
            "frac_missing_temp": float(window_raw["Temp"].isna().mean()),
            "frac_missing_resp": float(window_raw["Resp"].isna().mean()),

            "sepsis_label": int(df_ff.iloc[t]["SepsisLabel"]),
        }
        rows.append(row)

    return pd.DataFrame(rows)


def mean_impute(df: pd.DataFrame, feature_cols: list) -> pd.DataFrame:
    """Fills remaining NaNs with the population mean for that feature.
    Falls back to 0 if a column is 100% missing across the whole dataset
    (so its own mean would itself be NaN)."""
    df = df.copy()
    for col in feature_cols:
        if df[col].isna().any():
            fill_value = df[col].mean()
            if pd.isna(fill_value):
                fill_value = 0.0
            df[col] = df[col].fillna(fill_value)
    return df


def main():
    parser = argparse.ArgumentParser(description="Prepare PhysioNet 2019 training_setA for risk engine training.")
    parser.add_argument("--input_dir", required=True, help="Path to training_setA folder containing .psv files")
    parser.add_argument("--output_dir", default=".", help="Where to write processed_data.csv and feature_names.json")
    args = parser.parse_args()

    psv_files = sorted(glob.glob(os.path.join(args.input_dir, "*.psv")))
    if not psv_files:
        raise FileNotFoundError(f"No .psv files found in {args.input_dir}")

    print(f"Found {len(psv_files)} patient files. Processing...")

    all_frames = []
    for i, path in enumerate(psv_files):
        patient_id = os.path.splitext(os.path.basename(path))[0]
        df = load_patient_file(path)
        if df.empty:
            continue
        features = engineer_patient_features(df, patient_id)
        all_frames.append(features)

        if (i + 1) % 2000 == 0:
            print(f"  ...{i + 1}/{len(psv_files)} patients processed")

    full_df = pd.concat(all_frames, ignore_index=True)

    feature_cols = [
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

    full_df = mean_impute(full_df, feature_cols)

    n_total = len(full_df)
    n_positive = int(full_df["sepsis_label"].sum())
    pct_positive = 100 * n_positive / n_total if n_total else 0.0
    print(f"\nTotal rows (patient-hours): {n_total}")
    print(f"Positive (SepsisLabel=1) rows: {n_positive} ({pct_positive:.2f}%)")
    print("Use class_weight='balanced' at training time to address this imbalance.")

    os.makedirs(args.output_dir, exist_ok=True)
    out_csv = os.path.join(args.output_dir, "processed_data.csv")
    full_df.to_csv(out_csv, index=False)
    print(f"\nSaved: {out_csv}")

    feature_names_path = os.path.join(args.output_dir, "feature_names.json")
    with open(feature_names_path, "w") as f:
        json.dump({"feature_columns": feature_cols, "label_column": "sepsis_label"}, f, indent=2)
    print(f"Saved: {feature_names_path}")


if __name__ == "__main__":
    main()