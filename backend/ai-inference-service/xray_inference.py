from __future__ import annotations

import base64
import io
import json
import threading
import time
from pathlib import Path

from PIL import Image, UnidentifiedImageError


MODELS_DIR = Path(__file__).parent / "models"
WEIGHTS_PATH = MODELS_DIR / "xray_model.pth"
CLASSES_PATH = MODELS_DIR / "xray_class_names.json"

CONFIDENCE_THRESHOLD = 60.0
IMG_SIZE = 224
MAX_FILE_BYTES = 10 * 1024 * 1024

_model = None
_class_names: list[str] = []
_device = None
_transform = None
_load_error: str | None = None
_load_lock = threading.Lock()
_loading = False
_last_load_seconds: float | None = None


def _load_model() -> bool:
    global _model, _class_names, _device, _transform, _load_error, _loading, _last_load_seconds

    if _model is not None:
        return True

    with _load_lock:
        if _model is not None:
            return True

        if not WEIGHTS_PATH.exists():
            _load_error = "Model weights not found. Please run train_xray_model.py first."
            return False
        if not CLASSES_PATH.exists():
            _load_error = "X-ray class names file not found."
            return False

        started_at = time.time()
        _loading = True
        _last_load_seconds = None

        try:
            import torch
            import torch.nn as nn
            from torchvision import models, transforms

            _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            _transform = transforms.Compose([
                transforms.Resize((IMG_SIZE, IMG_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ])

            with open(CLASSES_PATH) as f:
                _class_names = json.load(f)

            net = models.mobilenet_v2(weights=None)
            in_features = net.classifier[1].in_features
            net.classifier[1] = nn.Linear(in_features, len(_class_names))
            net.load_state_dict(torch.load(WEIGHTS_PATH, map_location=_device))
            net.to(_device)
            net.eval()
            _model = net
            _load_error = None
            _last_load_seconds = round(time.time() - started_at, 2)
            print(
                f"[XRay] Model loaded in {_last_load_seconds}s: "
                f"{len(_class_names)} classes -> {_class_names}"
            )
            return True
        except Exception as e:
            _load_error = str(e)
            print(f"[XRay] Model load failed: {_load_error}")
            return False
        finally:
            _loading = False


def model_loaded() -> bool:
    return _model is not None


def model_loading() -> bool:
    return _loading


def get_model_info(load: bool = True) -> dict:
    loaded = model_loaded() or (load and _load_model())
    if not loaded:
        return {
            "loaded": False,
            "loading": model_loading(),
            "error": _load_error,
        }

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
        "load_seconds": _last_load_seconds,
        "training_metrics": metrics,
    }


def predict_xray_disease(base64_image: str) -> dict:
    if not (model_loaded() or _load_model()):
        return {
            "error": _load_error or "Model weights not found. Please run train_xray_model.py first.",
            "top_class": None,
            "top_confidence": 0,
            "all_probabilities": [],
            "low_confidence": True,
        }

    try:
        raw_bytes = base64.b64decode(base64_image, validate=True)
    except Exception:
        return {
            "error": "Cannot decode image. Please upload a valid JPG or PNG file.",
            "top_class": None,
            "top_confidence": 0,
            "all_probabilities": [],
            "low_confidence": True,
        }
    if len(raw_bytes) > MAX_FILE_BYTES:
        return {
            "error": f"File exceeds 10 MB limit ({len(raw_bytes) // (1024 * 1024):.1f} MB received).",
            "top_class": None,
            "top_confidence": 0,
            "all_probabilities": [],
            "low_confidence": True,
        }

    try:
        img = Image.open(io.BytesIO(raw_bytes))
    except UnidentifiedImageError:
        return {
            "error": "Cannot decode image. Please upload a valid JPG or PNG file.",
            "top_class": None,
            "top_confidence": 0,
            "all_probabilities": [],
            "low_confidence": True,
        }

    if img.width < 100 or img.height < 100:
        return {
            "error": f"Image resolution too low ({img.width}x{img.height}). Minimum is 100x100 pixels.",
            "top_class": None,
            "top_confidence": 0,
            "all_probabilities": [],
            "low_confidence": True,
        }

    import torch
    import torch.nn.functional as F

    img = img.convert("RGB")
    t0 = time.time()
    tensor = _transform(img).unsqueeze(0).to(_device)

    with torch.no_grad():
        logits = _model(tensor)
        probs = F.softmax(logits, dim=1)[0].cpu().tolist()

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
            "Model confidence below threshold. This result should be reviewed "
            "by a qualified radiologist before clinical use."
        )

    return {
        "top_class": top["class"],
        "top_confidence": top["probability"],
        "all_probabilities": all_probs,
        "low_confidence": low_confidence,
        "warning": warning,
        "processing_ms": round((time.time() - t0) * 1000, 1),
        "error": None,
    }


print("[XRay] Lazy loading enabled; model will load on first X-ray request.")
