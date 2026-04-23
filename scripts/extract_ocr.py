#!/usr/bin/env python3
"""
Stage 1: OCR Extraction Pipeline
Reads all PNG symptom report images from combined train CSVs,
runs pytesseract on each image, cleans the extracted text,
and saves to extracted_corpus.csv to avoid re-running OCR.

Usage: python scripts/extract_ocr.py
"""

import os
import re
import sys
import pandas as pd
import pytesseract
from PIL import Image
from pathlib import Path

# ─── CONFIG ─────────────────────────────────────────────────────────────────

# Adjust this to your local Tesseract installation if needed
if os.name == 'nt':
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

DATASET_ROOT = Path(r"C:\Users\Shubham\Downloads\matrix\Patient Symptoms Report Image & Disease Dataset\dataset")
OUTPUT_PATH = Path(__file__).parent.parent / "ml" / "extracted_corpus.csv"

TRAIN_CSVS = [
    DATASET_ROOT / "Symptom2Disease_dataset_train.csv",
    DATASET_ROOT / "gretalai_dataset_train.csv",
    DATASET_ROOT / "venetis_dataset_train.csv",
]

TEST_CSVS = [
    DATASET_ROOT / "Symptom2Disease_dataset_test.csv",
    DATASET_ROOT / "gretalai_dataset_test.csv",
    DATASET_ROOT / "venetis_dataset_test.csv",
]


def clean_text(raw: str) -> str:
    """Lowercase, strip special chars, collapse whitespace."""
    text = raw.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_and_merge(csv_paths: list, split_label: str) -> pd.DataFrame:
    dfs = []
    for p in csv_paths:
        if not p.exists():
            print(f"  [WARN] CSV not found: {p} – skipping")
            continue
        df = pd.read_csv(p)
        df["split"] = split_label
        dfs.append(df)
    merged = pd.concat(dfs, ignore_index=True)
    merged = merged.drop_duplicates().reset_index(drop=True)
    return merged


def extract_text_for_row(row: pd.Series) -> str:
    """Run pytesseract on the image referenced in `file_name`."""
    img_path = DATASET_ROOT / row["file_name"]
    try:
        img = Image.open(img_path).convert("RGB")
        raw = pytesseract.image_to_string(img, config="--psm 6")
        return clean_text(raw)
    except Exception as e:
        print(f"  [ERROR] {img_path.name}: {e}")
        return ""


def main():
    print("=== MedCoPilot OCR Extraction Pipeline ===")

    # Load and merge all splits
    print("\n[1/3] Loading CSVs...")
    train_df = load_and_merge(TRAIN_CSVS, "train")
    test_df  = load_and_merge(TEST_CSVS,  "test")
    all_df   = pd.concat([train_df, test_df], ignore_index=True)
    print(f"  Combined rows: {len(all_df):,}  |  Train: {len(train_df):,}  |  Test: {len(test_df):,}")

    # Check if partial output exists for resumption
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if OUTPUT_PATH.exists():
        done = pd.read_csv(OUTPUT_PATH)
        done_files = set(done["file_name"].tolist())
        remaining = all_df[~all_df["file_name"].isin(done_files)].reset_index(drop=True)
        print(f"\n[RESUME] {len(done):,} already done, {len(remaining):,} remaining")
        rows = remaining
    else:
        done = pd.DataFrame()
        rows = all_df

    if rows.empty:
        print("\n[✓] All images already processed. Output:", OUTPUT_PATH)
        return

    # Run OCR
    print(f"\n[2/3] Running OCR on {len(rows):,} images...\n")
    extracted = []
    for i, row in rows.iterrows():
        text = extract_text_for_row(row)
        extracted.append({
            "file_name": row["file_name"],
            "disease":   row["disease"],
            "split":     row["split"],
            "text":      text,
        })
        if (i + 1) % 50 == 0 or (i + 1) == len(rows):
            pct = (i + 1) / len(rows) * 100
            print(f"  [{pct:5.1f}%] {i+1}/{len(rows)} — {row['file_name']}")

    # Merge with existing done rows and save
    print("\n[3/3] Saving corpus...")
    new_df = pd.DataFrame(extracted)
    combined = pd.concat([done, new_df], ignore_index=True)
    combined.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")
    print(f"\n[✓] Saved {len(combined):,} rows → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
