from __future__ import annotations

import base64
import io
import json
import os
import re
from pathlib import Path

import joblib
import numpy as np
from PIL import Image

from ocr import process_lab_report


ML_DIR = Path(__file__).parent / "ml"

ICD11 = {
    "Acne": "EA80",
    "Allergy": "4A20",
    "Arthritis": "FA20",
    "Bronchial Asthma": "CA23",
    "Cervical Spondylosis": "FA80.1",
    "Chicken Pox": "1E90",
    "Common Cold": "CA00",
    "Dengue": "1D2Z",
    "Diabetes": "5A10",
    "Dimorphic Hemorrhoids": "DB35",
    "Drug Reaction": "EH45",
    "Fungal Infection": "1F20",
    "Gastroesophageal Reflux Disease": "DA22",
    "Hypertension": "BA00",
    "Impetigo": "1B71",
    "Jaundice": "ME07",
    "Malaria": "1F40",
    "Migraine": "8A80",
    "Peptic Ulcer Disease": "DA61",
    "Pneumonia": "CA40",
    "Psoriasis": "EA90",
    "Typhoid": "1A07",
    "Urinary Tract Infection": "GC08",
    "Varicose Veins": "BD90",
}

try:
    TFIDF = joblib.load(ML_DIR / "tfidf_vectorizer.pkl")
    MODEL = joblib.load(ML_DIR / "symptom_nlp_model.pkl")
    LE = joblib.load(ML_DIR / "label_encoder.pkl")
    with open(ML_DIR / "disease_keywords.json", "r", encoding="utf-8") as f:
        DISEASE_KEYWORDS = json.load(f)
    MODELS_LOADED = True
    LOAD_ERROR = ""
except Exception as e:
    TFIDF = None
    MODEL = None
    LE = None
    DISEASE_KEYWORDS = {}
    MODELS_LOADED = False
    LOAD_ERROR = str(e)


def clean_text(raw: str) -> str:
    text = raw.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_image_text(base64_image: str) -> str:
    image_bytes = base64.b64decode(base64_image)
    ocr_result = process_lab_report(file_name="report.png", file_content=image_bytes)
    if ocr_result.get("success"):
        return str(ocr_result.get("raw_text") or "")

    if os.getenv("ALLOW_TESSERACT_OCR_FALLBACK", "").lower() != "true":
        raise RuntimeError(str(ocr_result.get("error") or "OCR failed"))

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    import pytesseract

    return pytesseract.image_to_string(image, config="--psm 6")


def compute_matched_keywords(input_text: str, top_diseases: list[dict]) -> dict[str, list[str]]:
    words = set(input_text.lower().split())
    matched = {}
    for disease in top_diseases:
        disease_name = str(disease["disease"])
        keywords = DISEASE_KEYWORDS.get(disease_name, [])
        matched[disease_name] = [
            kw for kw in keywords if any(word in kw or kw in words for word in words)
        ][:5]
    return matched


def predict_text(text: str) -> dict:
    if not MODELS_LOADED:
        raise RuntimeError(f"Models not loaded: {LOAD_ERROR}")

    cleaned = clean_text(text)
    if not cleaned:
        raise ValueError("Input text is empty after cleaning.")

    vec = TFIDF.transform([cleaned])
    proba = MODEL.predict_proba(vec)[0]
    top5_idx = np.argsort(proba)[-5:][::-1]

    predictions = []
    for idx in top5_idx:
        disease = LE.classes_[idx]
        disease_title = disease.title()
        predictions.append(
            {
                "disease": disease_title,
                "probability": round(float(proba[idx]), 4),
                "icd11_code": ICD11.get(disease_title, "N/A"),
            }
        )

    return {
        "predictions": predictions,
        "matched_keywords": compute_matched_keywords(cleaned, predictions),
    }


def predict_report(mode: str, input_value: str) -> dict:
    text = extract_image_text(input_value) if mode == "image" else input_value
    result = predict_text(text)
    if mode == "image":
        result["extracted_text"] = text
    return result
