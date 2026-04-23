#!/usr/bin/env python3
"""
Inference Script — Disease Prediction from Symptom Text or Image
Called by the Next.js API route via child_process.spawn().

Input via stdin (JSON):
  { "mode": "text", "input": "patient has dry cough and fever..." }
  { "mode": "image", "input": "<base64-encoded-png>" }

Output via stdout (JSON):
  {
    "predictions": [
      { "disease": "Dengue", "probability": 0.83, "icd11_code": "1D2Z" },
      ...top 5...
    ],
    "extracted_text": "..." (only for image mode),
    "matched_keywords": { "Dengue": ["fever", "headache", ...], ... }
  }
"""

import sys
import os
import re
import json
import base64
import io
import joblib
import numpy as np
from pathlib import Path

# ─── Pre-load models at process start (warm-up) ─────────────────────────────
ML_DIR = Path(__file__).parent.parent / "ml"

try:
    TFIDF = joblib.load(ML_DIR / "tfidf_vectorizer.pkl")
    MODEL = joblib.load(ML_DIR / "symptom_nlp_model.pkl")
    LE    = joblib.load(ML_DIR / "label_encoder.pkl")
    with open(ML_DIR / "disease_keywords.json", "r", encoding="utf-8") as f:
        DISEASE_KEYWORDS = json.load(f)
    MODELS_LOADED = True
except Exception as e:
    MODELS_LOADED = False
    LOAD_ERROR = str(e)


# ICD-11 mapping for common diseases
ICD11 = {
    "Acne":                          "EA80",
    "Allergy":                        "4A20",
    "Arthritis":                      "FA20",
    "Bronchial Asthma":               "CA23",
    "Cervical Spondylosis":           "FA80.1",
    "Chicken Pox":                    "1E90",
    "Common Cold":                    "CA00",
    "Dengue":                         "1D2Z",
    "Diabetes":                       "5A10",
    "Dimorphic Hemorrhoids":          "DB35",
    "Drug Reaction":                  "EH45",
    "Fungal Infection":               "1F20",
    "Gastroesophageal Reflux Disease":"DA22",
    "Hypertension":                   "BA00",
    "Impetigo":                       "1B71",
    "Jaundice":                       "ME07",
    "Malaria":                        "1F40",
    "Migraine":                       "8A80",
    "Peptic Ulcer Disease":           "DA61",
    "Pneumonia":                      "CA40",
    "Psoriasis":                      "EA90",
    "Typhoid":                        "1A07",
    "Urinary Tract Infection":        "GC08",
    "Varicose Veins":                 "BD90",
}


def clean_text(raw: str) -> str:
    text = raw.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_ocr_text(b64_image: str) -> str:
    """Run pytesseract on base64 encoded image. Returns cleaned text."""
    try:
        import pytesseract
        from PIL import Image
        tesseract_cmd = os.getenv("TESSERACT_CMD", "").strip()
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        image_bytes = base64.b64decode(b64_image)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        raw = pytesseract.image_to_string(img, config="--psm 6")
        return clean_text(raw)
    except Exception as e:
        return f"ocr_error: {str(e)}"


def compute_matched_keywords(input_text: str, top_diseases: list) -> dict:
    """Find which top TF-IDF keywords from the disease dict appear in input text."""
    words = set(input_text.lower().split())
    matched = {}
    for disease in top_diseases:
        disease_name = disease["disease"]
        keywords = DISEASE_KEYWORDS.get(disease_name, [])
        # Only return keywords that actually appear in user's input
        matched[disease_name] = [kw for kw in keywords if any(word in kw or kw in words for word in words)][:5]
    return matched


def predict(text: str) -> list:
    """Returns top 5 predictions with probabilities."""
    vec = TFIDF.transform([text])
    proba = MODEL.predict_proba(vec)[0]
    
    top5_idx = np.argsort(proba)[-5:][::-1]
    predictions = []
    for idx in top5_idx:
        disease = LE.classes_[idx]
        prob    = float(proba[idx])
        predictions.append({
            "disease":     disease.title(),
            "probability": round(prob, 4),
            "icd11_code":  ICD11.get(disease.title(), "N/A"),
        })
    return predictions


def main():
    if not MODELS_LOADED:
        error = {"error": f"Models not loaded: {LOAD_ERROR}. Run npm run train-nlp first."}
        print(json.dumps(error))
        sys.exit(1)

    try:
        raw = sys.stdin.read().strip()
        payload = json.loads(raw)
    except Exception as e:
        print(json.dumps({"error": f"Invalid input JSON: {e}"}))
        sys.exit(1)

    mode  = payload.get("mode", "text")
    input = payload.get("input", "")

    extracted_text = None

    if mode == "image":
        extracted_text = extract_ocr_text(input)
        if extracted_text.startswith("ocr_error"):
            print(json.dumps({"error": extracted_text}))
            sys.exit(1)
        text_for_model = extracted_text
    else:
        text_for_model = clean_text(input)

    if not text_for_model.strip():
        print(json.dumps({"error": "Input text is empty after cleaning."}))
        sys.exit(1)

    predictions     = predict(text_for_model)
    matched_keywords = compute_matched_keywords(text_for_model, predictions)

    result = {
        "predictions":       predictions,
        "matched_keywords":  matched_keywords,
    }
    if extracted_text is not None:
        result["extracted_text"] = extracted_text

    print(json.dumps(result))


if __name__ == "__main__":
    main()
