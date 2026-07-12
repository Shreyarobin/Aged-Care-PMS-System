"""
add_age.py — Sprint 1, Step 1.4 (support script)
Aged Care PMS — Clinical Risk Engine

Extracts each patient's Age from the raw PhysioNet .psv files into a
lightweight patient_id -> age lookup table. Age is the primary input to a
SYNTHETIC frailty proxy used in ablation.py, standing in for real InterRAI
frailty_index data (PhysioNet has no frailty assessment of any kind).

This is a fast, separate pass — it does NOT repeat the full windowing done
in prepare_data.py, it just reads each file's Age column once.

Usage:
    python add_age.py --input_dir "C:\\Users\\LENOVO\\Downloads\\physionet2019\\training_setA" --output_csv "risk_engine\\age_lookup.csv"
"""

import argparse
import glob
import os

import pandas as pd


def main():
    parser = argparse.ArgumentParser(description="Extract per-patient Age from PhysioNet .psv files.")
    parser.add_argument("--input_dir", required=True, help="Path to training_setA folder")
    parser.add_argument("--output_csv", default="age_lookup.csv", help="Where to save the patient_id -> age lookup")
    args = parser.parse_args()

    psv_files = sorted(glob.glob(os.path.join(args.input_dir, "*.psv")))
    if not psv_files:
        raise FileNotFoundError(f"No .psv files found in {args.input_dir}")

    print(f"Found {len(psv_files)} patient files. Extracting Age...")
    rows = []
    for i, path in enumerate(psv_files):
        patient_id = os.path.splitext(os.path.basename(path))[0]
        df = pd.read_csv(path, sep="|", usecols=["Age"])
        age_values = df["Age"].dropna()
        age = float(age_values.iloc[0]) if len(age_values) > 0 else None
        rows.append({"patient_id": patient_id, "age": age})

        if (i + 1) % 5000 == 0:
            print(f"  ...{i + 1}/{len(psv_files)} processed")

    out_df = pd.DataFrame(rows)
    n_missing = int(out_df["age"].isna().sum())
    if n_missing:
        median_age = out_df["age"].median()
        out_df["age"] = out_df["age"].fillna(median_age)
        print(f"Filled {n_missing} missing ages with dataset median ({median_age:.1f})")

    out_df.to_csv(args.output_csv, index=False)
    print(f"Saved: {args.output_csv} ({len(out_df)} patients)")


if __name__ == "__main__":
    main()