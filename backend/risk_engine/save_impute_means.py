"""
save_impute_means.py — Sprint 1, Step 1.5 (support script)
Aged Care PMS — Clinical Risk Engine

Computes the population mean of each feature column from processed_data.csv
and saves them as impute_means.json. inference.py uses these exact saved
values to fill any missing features at serving time — NOT a value recomputed
fresh per request — so a resident with sparse vitals data gets the same
fallback behavior the model was actually trained on, avoiding train/serve
skew.

Usage:
    python save_impute_means.py --input_csv "risk_engine\\processed_data.csv" --output_dir "risk_engine"
"""

import argparse
import json
import os

import pandas as pd

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


def main():
    parser = argparse.ArgumentParser(description="Save training-set feature means for inference-time imputation.")
    parser.add_argument("--input_csv", required=True, help="Path to processed_data.csv")
    parser.add_argument("--output_dir", default=".", help="Where to write impute_means.json")
    args = parser.parse_args()

    df = pd.read_csv(args.input_csv)
    means = {col: float(df[col].mean()) for col in FEATURE_COLS}

    os.makedirs(args.output_dir, exist_ok=True)
    out_path = os.path.join(args.output_dir, "impute_means.json")
    with open(out_path, "w") as f:
        json.dump(means, f, indent=2)

    print(f"Saved: {out_path}")
    for k, v in means.items():
        print(f"  {k}: {v:.3f}")


if __name__ == "__main__":
    main()