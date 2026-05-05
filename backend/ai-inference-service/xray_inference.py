"""
xray_inference.py
=================
Lightweight module loaded once at FastAPI startup.

Exposes:
  predict_xray_disease(base64_image: str) → dict
  model_loaded() → bool

Returns dict with keys:
  top_class         (str)
  top_confidence    (float 0-100)
  all_probabilities (list[dict{class, probability}])
  low_confidence    (bool)    — True if top < 60%
  warning           (str | None)
  error             (str | None)
"""

from __future__ import annotations

import base64
import io
import json
import time
from pathlib import Path

import torch
import torch.nn.functional as F
from PIL import Image, UnidentifiedImageError
from torchvision import models, transforms
import torch.nn as nn

# ──────────────────────────────────────────────
MODELS_DIR  = Path(__file__).parent / "models"
WEIGHTS_PATH = MODELS_DIR / "xray_model.pth"
CLASSES_PATH = MODELS_DIR / "xray_class_names.json"

CONFIDENCE_THRESHOLD = 60.0   # percent
IMG_SIZE = 224
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

_model: torch.nn.Module | None = None
_class_names: list[str] = []
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ImageNet normalization identical to training
_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


def _load_model() -> bool:
    global _model, _class_names

    if not WEIGHTS_PATH.exists():
        return False
    if not CLASSES_PATH.exists():
        return False

    with open(CLASSES_PATH) as f:
        _class_names = json.load(f)

    num_classes = len(_class_names)
    net = models.mobilenet_v2(weights=None)
    in_features = net.classifier[1].in_features
    net.classifier[1] = nn.Linear(in_features, num_classes)
    net.load_state_dict(torch.load(WEIGHTS_PATH, map_location=_device))
    net.to(_device)
    net.eval()
    _model = net
    return True


def model_loaded() -> bool:
    return _model is not None


def get_model_info() -> dict:
    """Returns metadata for the /ai/xray-health endpoint."""
    if not model_loaded():
        return {"loaded": False}

    total_params = sum(p.numel() for p in _model.parameters())
    metrics_path = MODELS_DIR / "xray_model_metrics.json"
    metrics = {}
    if metrics_path.exists():
        with open(metrics_path) as f:
            metrics = json.load(f)

    return {
        "loaded": True,
        "architecture": "MobileNetV2",
        "num_classes": len(_class_names),
        "class_names": _class_names,
        "total_parameters": total_params,
        "device": str(_device),
        "training_metrics": metrics,
    }


def predict_xray_disease(base64_image: str) -> dict:
    """
    Takes a base64-encoded image string, validates it, and runs inference.
    Returns a structured result dict.
    """
    # ── Validation ──────────────────────────────────────────
    if not model_loaded():
        return {
            "error": "Model weights not found. Please run train_xray_model.py first.",
            "top_class": None, "top_confidence": 0,
            "all_probabilities": [], "low_confidence": True,
        }

    raw_bytes = base64.b64decode(base64_image)

    if len(raw_bytes) > MAX_FILE_BYTES:
        return {
            "error": f"File exceeds 10 MB limit ({len(raw_bytes) // (1024*1024):.1f} MB received).",
            "top_class": None, "top_confidence": 0,
            "all_probabilities": [], "low_confidence": True,
        }

    try:
        img = Image.open(io.BytesIO(raw_bytes))
    except UnidentifiedImageError:
        return {
            "error": "Cannot decode image. Please upload a valid JPG or PNG file.",
            "top_class": None, "top_confidence": 0,
            "all_probabilities": [], "low_confidence": True,
        }

    # Minimum resolution check
    if img.width < 100 or img.height < 100:
        return {
            "error": f"Image resolution too low ({img.width}×{img.height}). Minimum is 100×100 pixels.",
            "top_class": None, "top_confidence": 0,
            "all_probabilities": [], "low_confidence": True,
        }

    # Convert to RGB (handles grayscale X-rays and RGBA PNGs)
    img = img.convert("RGB")

    # ── Inference ───────────────────────────────────────────
    t0 = time.time()
    tensor = _transform(img).unsqueeze(0).to(_device)

    with torch.no_grad():
        logits = _model(tensor)
        probs  = F.softmax(logits, dim=1)[0].cpu().tolist()

    elapsed_ms = round((time.time() - t0) * 1000, 1)

    all_probs = [
        {"class": _class_names[i], "probability": round(probs[i] * 100, 2)}
        for i in range(len(_class_names))
    ]
    all_probs.sort(key=lambda x: x["probability"], reverse=True)

    top = all_probs[0]
    low_confidence = top["probability"] < CONFIDENCE_THRESHOLD

    warning = None
    if low_confidence:
        warning = (
            "Model confidence below threshold. "
            "This result should be reviewed by a qualified radiologist before clinical use."
        )

    return {
        "top_class":        top["class"],
        "top_confidence":   top["probability"],
        "all_probabilities": all_probs,
        "low_confidence":   low_confidence,
        "warning":          warning,
        "processing_ms":    elapsed_ms,
        "error":            None,
    }


# Load model immediately when module is imported
_loaded = _load_model()
if _loaded:
    print(f"[XRay] Model loaded: {len(_class_names)} classes -> {_class_names}")
else:
    print("[XRay] Model weights not found - run train_xray_model.py first.")
