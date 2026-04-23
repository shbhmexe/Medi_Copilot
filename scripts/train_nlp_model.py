#!/usr/bin/env python3
"""
Stage 2 + 3: Feature Engineering & Model Training
Reads extracted_corpus.csv, trains TF-IDF + MultinomialNB (primary),
LinearSVC and Logistic Regression (comparison).
Exports: tfidf_vectorizer.pkl, symptom_nlp_model.pkl, label_encoder.pkl,
         disease_keywords.json

Usage: python scripts/train_nlp_model.py
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

# ─── CONFIG ─────────────────────────────────────────────────────────────────

CORPUS_PATH  = Path(__file__).parent.parent / "ml" / "extracted_corpus.csv"
ML_DIR       = Path(__file__).parent.parent / "ml"


def normalize_disease(name: str) -> str:
    """Normalise case so 'Chicken pox' and 'Chicken Pox' merge."""
    return name.strip().title()


def main():
    print("=== MedCoPilot NLP Model Training Pipeline ===\n")

    # ── Load corpus ──────────────────────────────────────────────────────────
    if not CORPUS_PATH.exists():
        print(f"[ERROR] Corpus not found: {CORPUS_PATH}")
        print("  Run `npm run extract-ocr` first to generate the corpus.")
        sys.exit(1)

    df = pd.read_csv(CORPUS_PATH)
    print(f"[1/6] Loaded {len(df):,} rows from corpus.")

    # Normalise disease labels across all 3 datasets (case differences exist!)
    df["disease"] = df["disease"].apply(normalize_disease)

    # Drop empty texts
    df = df[df["text"].notna() & (df["text"].str.strip() != "")]
    print(f"       After dropping empty OCR rows: {len(df):,}")

    # ── Split train / test ───────────────────────────────────────────────────
    train_df = df[df["split"] == "train"].reset_index(drop=True)
    test_df  = df[df["split"] == "test"].reset_index(drop=True)

    # Fallback: if split column is missing, do 80/20 manually
    if train_df.empty:
        print("  [WARN] 'split' column missing — doing 80/20 random split")
        train_df = df.sample(frac=0.8, random_state=42)
        test_df  = df.drop(train_df.index)

    print(f"       Train: {len(train_df):,}  |  Test: {len(test_df):,}")

    # ── Label encoding ───────────────────────────────────────────────────────
    print("\n[2/6] Encoding labels...")
    le = LabelEncoder()
    le.fit(df["disease"])  # Fit on ALL data so encoder knows all classes
    y_train = le.transform(train_df["disease"])
    y_test  = le.transform(test_df["disease"])
    classes = le.classes_
    print(f"       Unique disease classes: {len(classes)}")
    for c in sorted(classes):
        print(f"         • {c}")

    # ── TF-IDF Feature Engineering ───────────────────────────────────────────
    print("\n[3/6] Building TF-IDF vectors...")
    tfidf = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        stop_words="english",
        sublinear_tf=True,     # Log scaling for better text classification
    )
    X_train = tfidf.fit_transform(train_df["text"])
    X_test  = tfidf.transform(test_df["text"])
    print(f"       Feature matrix shape: {X_train.shape}")

    # ── Train & compare 3 models ─────────────────────────────────────────────
    print("\n[4/6] Training models...")
    models = {
        "MultinomialNB (primary)": MultinomialNB(alpha=0.1),
        "LinearSVC":               LinearSVC(max_iter=1000, C=1.0),
        "LogisticRegression":      LogisticRegression(max_iter=1000, C=5.0, solver="saga"),
    }

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        preds  = model.predict(X_test)
        acc    = accuracy_score(y_test, preds)
        results[name] = acc
        print(f"\n  ── {name}  (Accuracy: {acc:.2%}) ──")
        print(classification_report(y_test, preds, target_names=classes, zero_division=0))

    # ── Export artifacts ─────────────────────────────────────────────────────
    print("\n[5/6] Exporting ML artifacts...")
    ML_DIR.mkdir(parents=True, exist_ok=True)

    primary_model = models["MultinomialNB (primary)"]
    joblib.dump(tfidf,         ML_DIR / "tfidf_vectorizer.pkl")
    joblib.dump(primary_model, ML_DIR / "symptom_nlp_model.pkl")
    joblib.dump(le,            ML_DIR / "label_encoder.pkl")
    print("  ✓ tfidf_vectorizer.pkl")
    print("  ✓ symptom_nlp_model.pkl  (MultinomialNB)")
    print("  ✓ label_encoder.pkl")

    # ── Build disease_keywords.json ──────────────────────────────────────────
    print("\n[6/6] Building disease → keyword map...")
    feature_names = np.array(tfidf.get_feature_names_out())
    disease_keywords = {}

    for i, disease in enumerate(le.classes_):
        # For NB: take the log-probability vector for this class
        log_probs = primary_model.feature_log_prob_[i]
        top_idx   = np.argsort(log_probs)[-10:][::-1]
        top_terms = feature_names[top_idx].tolist()
        disease_keywords[disease] = top_terms

    keywords_path = ML_DIR / "disease_keywords.json"
    with open(keywords_path, "w", encoding="utf-8") as f:
        json.dump(disease_keywords, f, indent=2, ensure_ascii=False)
    print("  ✓ disease_keywords.json")

    print("\n═══════════════════════════════════════════════")
    print("  Model Training Complete!")
    print(f"  Best model: MultinomialNB  ({results['MultinomialNB (primary)']:.2%} accuracy)")
    print(f"  Artifacts saved to: {ML_DIR.resolve()}")
    print("═══════════════════════════════════════════════\n")


if __name__ == "__main__":
    main()
