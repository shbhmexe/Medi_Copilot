from __future__ import annotations

import json
import os
import re
import time
import base64
import io
import threading
from typing import Any

import requests
from PIL import Image


BROAD_MODEL_ID = os.getenv("HF_BROAD_XRAY_MODEL", "torchxrayvision/densenet121-res224-all")
TB_MODEL_ID = os.getenv("HF_TB_XRAY_MODEL", "JetX-GT/hades-hellix-tb-linear-probe")

LOCAL_PNEUMONIA_THRESHOLD = float(os.getenv("XRAY_PNEUMONIA_SHOW_THRESHOLD", "72"))
LOCAL_NORMAL_THRESHOLD = float(os.getenv("XRAY_NORMAL_SHOW_THRESHOLD", "80"))
BROAD_FINDING_THRESHOLD = float(os.getenv("XRAY_BROAD_MIN_SCORE", "0.6"))
TB_FINDING_THRESHOLD = float(os.getenv("XRAY_TB_MIN_SCORE", "0.65"))
HF_TIMEOUT_SECONDS = float(os.getenv("HF_XRAY_TIMEOUT_SECONDS", "25"))
HF_MODEL_API_IMAGE_SIZE = int(os.getenv("HF_MODEL_API_IMAGE_SIZE", "768"))
LOCAL_TXRV_MODEL = os.getenv("LOCAL_TXRV_MODEL", "densenet121-res224-all")
LOCAL_MOBILEVIT_XRAY_MODEL = os.getenv(
    "LOCAL_MOBILEVIT_XRAY_MODEL",
    "Jesteban247/mobilevit_small-chest_xray",
)
LOCAL_MOBILEVIT_RETRY_SECONDS = float(os.getenv("LOCAL_MOBILEVIT_RETRY_SECONDS", "300"))
HF_SPACE_TIMEOUT_SECONDS = float(os.getenv("HF_SPACE_XRAY_TIMEOUT_SECONDS", "30"))
HF_SPACE_POLL_TIMEOUT_SECONDS = float(os.getenv("HF_SPACE_XRAY_POLL_TIMEOUT_SECONDS", "120"))
BROAD_SPACE_URL = os.getenv(
    "HF_BROAD_XRAY_SPACE_URL",
    "https://itsomk-multilabel-chestxray-gradcam.hf.space",
)
BROAD_SPACE_API_NAME = os.getenv(
    "HF_BROAD_XRAY_SPACE_API_NAME",
    "analyze_and_prepare_download",
)
TB_SPACE_URL = os.getenv("HF_TB_XRAY_SPACE_URL", "")
TB_SPACE_API_NAME = os.getenv("HF_TB_XRAY_SPACE_API_NAME", "predict")

os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "5")
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

BROAD_LABEL_ORDER = [
    "Atelectasis",
    "Cardiomegaly",
    "Effusion",
    "Infiltration",
    "Mass",
    "Nodule",
    "Pneumothorax",
    "Edema",
    "Consolidation",
    "Fibrosis",
    "Pleural Thickening",
    "Hernia",
    "Pneumonia",
    "Emphysema",
    "Lung Opacity",
    "Lung Lesion",
    "Enlarged Cardiomediastinum",
    "Fracture",
]

PNEUMONIA_SUPPORT_LABELS = {"Pneumonia", "Consolidation", "Infiltration", "Lung Opacity"}
LOCAL_PNEUMONIA_CLASSES = {"BACTERIAL_PNEUMONIA", "VIRAL_PNEUMONIA"}
NON_DISEASE_LABELS = {"Support Devices"}

_txrv_model = None
_txrv_lock = threading.Lock()
_txrv_error: str | None = None
_mobilevit_model = None
_mobilevit_processor = None
_mobilevit_lock = threading.Lock()
_mobilevit_error: str | None = None
_mobilevit_failed_at: float | None = None

LABEL_ALIASES = {
    "atelectasis": "Atelectasis",
    "cardiomegaly": "Cardiomegaly",
    "effusion": "Effusion",
    "pleural effusion": "Effusion",
    "infiltration": "Infiltration",
    "infiltrate": "Infiltration",
    "mass": "Mass",
    "nodule": "Nodule",
    "pneumothorax": "Pneumothorax",
    "edema": "Edema",
    "oedema": "Edema",
    "consolidation": "Consolidation",
    "fibrosis": "Fibrosis",
    "pleural thickening": "Pleural Thickening",
    "pleural_thickening": "Pleural Thickening",
    "pleural other": "Pleural Thickening",
    "hernia": "Hernia",
    "pneumonia": "Pneumonia",
    "emphysema": "Emphysema",
    "lung opacity": "Lung Opacity",
    "lung_opacity": "Lung Opacity",
    "lung lesion": "Lung Lesion",
    "lung_lesion": "Lung Lesion",
    "enlarged cardiomediastinum": "Enlarged Cardiomediastinum",
    "enlarged_cardiomediastinum": "Enlarged Cardiomediastinum",
    "fracture": "Fracture",
    "normal": "Normal",
    "covid19": "COVID-19",
    "covid 19": "COVID-19",
    "covid-19": "COVID-19",
    "tuberculosis": "Tuberculosis",
    "turberculosis": "Tuberculosis",
    "no finding": "Normal",
    "no_finding": "Normal",
}


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() not in {"0", "false", "no", "off", ""}


def _clean_error(message: str, limit: int = 220) -> str:
    return " ".join(str(message).split())[:limit]


def _auth_headers() -> dict[str, str]:
    token = (
        os.getenv("HF_TOKEN")
        or os.getenv("HUGGINGFACE_API_TOKEN")
        or os.getenv("HUGGING_FACE_API_KEY")
        or ""
    ).strip()

    headers = {"Accept": "application/json"}
    if token:
        if token.lower().startswith("bearer"):
            headers["Authorization"] = token
        else:
            headers["Authorization"] = f"Bearer {token}"

    return headers


def _prepare_model_api_image(base64_image: str) -> bytes:
    raw = base64.b64decode(base64_image, validate=True)

    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img.thumbnail((HF_MODEL_API_IMAGE_SIZE, HF_MODEL_API_IMAGE_SIZE))
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=88, optimize=True)
        return buffer.getvalue()
    except Exception:
        return raw


def _image_data_url(base64_image: str) -> tuple[str, str]:
    raw = base64.b64decode(base64_image, validate=True)
    mime_type = "image/jpeg"
    if raw.startswith(b"\x89PNG"):
        mime_type = "image/png"
    elif raw.startswith(b"GIF"):
        mime_type = "image/gif"
    elif raw.startswith(b"RIFF") and b"WEBP" in raw[:16]:
        mime_type = "image/webp"

    return f"data:{mime_type};base64,{base64_image}", mime_type


def _normalize_space_root(value: str) -> str | None:
    value = value.strip().rstrip("/")
    if not value:
        return None

    if value.startswith("http://") or value.startswith("https://"):
        return value

    if "/" not in value:
        return value

    owner, name = value.split("/", 1)
    slug = f"{owner}-{name}".lower().replace("_", "-")
    return f"https://{slug}.hf.space"


def _space_api_enabled() -> bool:
    return _env_bool("ENABLE_HF_SPACE_XRAY", True)


def _local_torchxrayvision_enabled() -> bool:
    return _env_bool("ENABLE_LOCAL_TORCHXRAYVISION", True)


def _load_torchxrayvision_model():
    global _txrv_model, _txrv_error

    if _txrv_model is not None:
        return _txrv_model

    with _txrv_lock:
        if _txrv_model is not None:
            return _txrv_model

        try:
            import sys
            if hasattr(sys.stdout, "reconfigure"):
                sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

        try:
            import torchxrayvision as xrv
            model = xrv.models.DenseNet(weights=LOCAL_TXRV_MODEL)
            model.eval()
            _txrv_model = model
            _txrv_error = None
            return _txrv_model
        except Exception as exc:
            _txrv_error = str(exc)
            return None


def _call_local_torchxrayvision(base64_image: str) -> dict[str, Any]:
    if not _local_torchxrayvision_enabled():
        return {
            "role": "broad_disease",
            "model": LOCAL_TXRV_MODEL,
            "available": False,
            "configured": False,
            "url_source": "local_torchxrayvision",
            "warning": "Local TorchXRayVision fallback is disabled.",
            "predictions": [],
        }

    started_at = time.time()
    model = _load_torchxrayvision_model()
    if model is None:
        return {
            "role": "broad_disease",
            "model": LOCAL_TXRV_MODEL,
            "available": False,
            "configured": True,
            "url_source": "local_torchxrayvision",
            "warning": f"Local TorchXRayVision fallback failed: {_clean_error(_txrv_error or 'unknown error')}",
            "predictions": [],
        }

    try:
        import numpy as np
        import torch
        import torchxrayvision as xrv

        raw = base64.b64decode(base64_image, validate=True)
        img = Image.open(io.BytesIO(raw)).convert("L")
        arr = np.array(img).astype(np.float32)
        arr = xrv.datasets.normalize(arr, 255)
        arr = arr[None, :, :]
        arr = xrv.datasets.XRayCenterCrop()(arr)
        arr = xrv.datasets.XRayResizer(224)(arr)
        tensor = torch.from_numpy(arr).unsqueeze(0)

        with torch.no_grad():
            scores = model(tensor)[0].detach().cpu().tolist()

        predictions = [
            {"label": str(label), "score": float(score)}
            for label, score in zip(model.pathologies, scores)
        ]
        predictions.sort(key=lambda row: row["score"], reverse=True)
        return {
            "role": "broad_disease",
            "model": LOCAL_TXRV_MODEL,
            "available": True,
            "configured": True,
            "url_source": "local_torchxrayvision",
            "predictions": predictions,
            "processing_ms": round((time.time() - started_at) * 1000, 1),
        }
    except Exception as exc:
        return {
            "role": "broad_disease",
            "model": LOCAL_TXRV_MODEL,
            "available": False,
            "configured": True,
            "url_source": "local_torchxrayvision",
            "warning": f"Local TorchXRayVision inference failed: {_clean_error(str(exc))}",
            "predictions": [],
        }


def _local_mobilevit_enabled() -> bool:
    return _env_bool("ENABLE_LOCAL_MOBILEVIT_XRAY", True)


def _load_local_mobilevit_model():
    global _mobilevit_model, _mobilevit_processor, _mobilevit_error, _mobilevit_failed_at

    if _mobilevit_model is not None and _mobilevit_processor is not None:
        return _mobilevit_processor, _mobilevit_model

    if (
        _mobilevit_failed_at is not None
        and time.time() - _mobilevit_failed_at < LOCAL_MOBILEVIT_RETRY_SECONDS
    ):
        return None

    with _mobilevit_lock:
        if _mobilevit_model is not None and _mobilevit_processor is not None:
            return _mobilevit_processor, _mobilevit_model
        if (
            _mobilevit_failed_at is not None
            and time.time() - _mobilevit_failed_at < LOCAL_MOBILEVIT_RETRY_SECONDS
        ):
            return None

        try:
            from transformers import AutoImageProcessor, AutoModelForImageClassification

            processor = AutoImageProcessor.from_pretrained(
                LOCAL_MOBILEVIT_XRAY_MODEL,
                use_fast=False,
            )
            model = AutoModelForImageClassification.from_pretrained(LOCAL_MOBILEVIT_XRAY_MODEL)
            model.eval()
            _mobilevit_processor = processor
            _mobilevit_model = model
            _mobilevit_error = None
            _mobilevit_failed_at = None
            return _mobilevit_processor, _mobilevit_model
        except Exception as exc:
            _mobilevit_error = str(exc)
            _mobilevit_failed_at = time.time()
            return None


def _call_local_mobilevit_xray(base64_image: str) -> dict[str, Any]:
    if not _local_mobilevit_enabled():
        return {
            "role": "tb_screening",
            "model": LOCAL_MOBILEVIT_XRAY_MODEL,
            "available": False,
            "configured": False,
            "url_source": "local_hf_model",
            "warning": "Local MobileViT X-ray fallback is disabled.",
            "predictions": [],
        }

    loaded = _load_local_mobilevit_model()
    if loaded is None:
        return {
            "role": "tb_screening",
            "model": LOCAL_MOBILEVIT_XRAY_MODEL,
            "available": False,
            "configured": True,
            "url_source": "local_hf_model",
            "warning": f"Local MobileViT X-ray fallback failed: {_clean_error(_mobilevit_error or 'unknown error')}",
            "predictions": [],
        }

    started_at = time.time()
    try:
        import torch

        processor, model = loaded
        raw = base64.b64decode(base64_image, validate=True)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        inputs = processor(images=img, return_tensors="pt")

        with torch.no_grad():
            logits = model(**inputs).logits
            if logits.shape[-1] == 1:
                scores = torch.sigmoid(logits)[0].detach().cpu().tolist()
            else:
                scores = torch.softmax(logits, dim=-1)[0].detach().cpu().tolist()

        id_to_label = getattr(model.config, "id2label", {}) or {}
        predictions = []
        for index, score in enumerate(scores):
            label = id_to_label.get(index) or id_to_label.get(str(index)) or f"LABEL_{index}"
            predictions.append({"label": str(label), "score": float(score)})

        predictions.sort(key=lambda row: row["score"], reverse=True)
        return {
            "role": "tb_screening",
            "model": LOCAL_MOBILEVIT_XRAY_MODEL,
            "available": True,
            "configured": True,
            "url_source": "local_hf_model",
            "predictions": predictions,
            "processing_ms": round((time.time() - started_at) * 1000, 1),
        }
    except Exception as exc:
        return {
            "role": "tb_screening",
            "model": LOCAL_MOBILEVIT_XRAY_MODEL,
            "available": False,
            "configured": True,
            "url_source": "local_hf_model",
            "warning": f"Local MobileViT X-ray inference failed: {_clean_error(str(exc))}",
            "predictions": [],
        }


def _resolve_model_url(model_id: str, endpoint_env: str) -> tuple[str | None, str]:
    endpoint_url = os.getenv(endpoint_env, "").strip()
    if endpoint_url:
        return endpoint_url.rstrip("/"), "dedicated_endpoint"

    if not _env_bool("HF_ALLOW_MODEL_API_FALLBACK", False):
        return None, "not_configured"

    base_url = os.getenv(
        "HF_INFERENCE_BASE_URL",
        "https://router.huggingface.co/hf-inference/models",
    ).rstrip("/")
    return f"{base_url}/{model_id}", "model_api"


def _extract_predictions(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        for key in ("predictions", "data", "outputs", "result"):
            value = payload.get(key)
            if isinstance(value, list):
                return _extract_predictions(value)

        parsed = []
        for label, score in payload.items():
            if isinstance(score, (int, float)):
                parsed.append({"label": str(label), "score": float(score)})
        return parsed

    if isinstance(payload, list):
        if payload and isinstance(payload[0], list):
            return _extract_predictions(payload[0])

        parsed = []
        for item in payload:
            if not isinstance(item, dict):
                continue

            label = item.get("label") or item.get("class") or item.get("name")
            score = item.get("score")
            if score is None:
                score = item.get("probability", item.get("confidence"))

            if label is None or not isinstance(score, (int, float)):
                continue

            score = float(score)
            if score > 1:
                score = score / 100
            parsed.append({"label": str(label), "score": max(0.0, min(1.0, score))})

        parsed.sort(key=lambda row: row["score"], reverse=True)
        return parsed

    return []


def _parse_prediction_text(text: str) -> list[dict[str, Any]]:
    allowed = {_normalize_label(label) for label in BROAD_LABEL_ORDER}
    allowed |= {"Normal", "COVID-19", "Tuberculosis"}
    predictions_by_label: dict[str, float] = {}

    for raw_line in text.replace("\r", "\n").split("\n"):
        line = raw_line.strip().lstrip("-").strip().replace("**", "")
        if ":" not in line or line.startswith("#"):
            continue

        label, score_part = line.split(":", 1)
        label = _normalize_label(label)
        if label not in allowed:
            continue

        match = re.search(r"([0-9]+(?:\.[0-9]+)?)", score_part)
        if not match:
            continue

        score = float(match.group(1))
        if score > 1:
            score = score / 100
        predictions_by_label[label] = max(predictions_by_label.get(label, 0.0), score)

    predictions = [
        {"label": label, "score": score}
        for label, score in predictions_by_label.items()
    ]
    predictions.sort(key=lambda row: row["score"], reverse=True)
    return predictions


def _call_gradio_space(
    *,
    base64_image: str,
    space_url: str,
    api_name: str,
    role: str,
    threshold: float | None = None,
) -> dict[str, Any]:
    root = _normalize_space_root(space_url)
    if not _space_api_enabled() or not root:
        return {
            "role": role,
            "model": space_url,
            "available": False,
            "configured": False,
            "url_source": "hf_space",
            "warning": "HF Space X-ray integration is disabled or not configured.",
            "predictions": [],
        }

    data_url, mime_type = _image_data_url(base64_image)
    data: list[Any] = [{
        "url": data_url,
        "orig_name": "xray.jpg",
        "mime_type": mime_type,
        "meta": {"_type": "gradio.FileData"},
    }]
    if threshold is not None:
        data.append(threshold)

    normalized_api_name = api_name.strip().lstrip("/")
    call_url = f"{root}/gradio_api/call/{normalized_api_name}"
    started_at = time.time()

    try:
        response = requests.post(
            call_url,
            json={"data": data},
            timeout=HF_SPACE_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        event_id = payload.get("event_id")
        if not event_id:
            output_data = payload.get("data") if isinstance(payload, dict) else None
        else:
            output_data = None
            stream = requests.get(
                f"{call_url}/{event_id}",
                stream=True,
                timeout=HF_SPACE_POLL_TIMEOUT_SECONDS,
            )
            stream.raise_for_status()
            for line in stream.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data: "):
                    continue
                output_data = json.loads(line[6:])

        if output_data is None:
            raise ValueError("Space returned no output data.")

        output_items = output_data if isinstance(output_data, list) else [output_data]
        text_outputs = "\n".join(
            item for item in output_items if isinstance(item, str)
        )
        predictions = _parse_prediction_text(text_outputs)

        if not predictions and output_items:
            predictions = _extract_predictions(output_items[-1])

        if not predictions and isinstance(output_items[0], str):
            label = output_items[0]
            predictions = [{"label": label, "score": 1.0}]

        return {
            "role": role,
            "model": root,
            "available": bool(predictions),
            "configured": True,
            "url_source": "hf_space",
            "predictions": predictions,
            "processing_ms": round((time.time() - started_at) * 1000, 1),
        }
    except Exception as exc:
        return {
            "role": role,
            "model": root,
            "available": False,
            "configured": True,
            "url_source": "hf_space",
            "warning": f"HF Space {role} request failed: {_clean_error(str(exc))}",
            "predictions": [],
            "processing_ms": round((time.time() - started_at) * 1000, 1),
        }


def _call_hf_image_model(
    *,
    base64_image: str,
    model_id: str,
    endpoint_env: str,
    role: str,
    top_k: int,
) -> dict[str, Any]:
    if not _env_bool("ENABLE_HF_XRAY", True):
        return {
            "role": role,
            "model": model_id,
            "available": False,
            "configured": False,
            "warning": "HF X-ray integration is disabled.",
            "predictions": [],
        }

    url, url_source = _resolve_model_url(model_id, endpoint_env)
    if not url:
        return {
            "role": role,
            "model": model_id,
            "available": False,
            "configured": False,
            "warning": (
                f"{endpoint_env} is not configured. This model is kept separate from the "
                "local pneumonia model and will run when a Hugging Face endpoint is added."
            ),
            "predictions": [],
        }

    headers = _auth_headers()
    request_kwargs: dict[str, Any]
    if url_source == "model_api":
        headers["Content-Type"] = "application/octet-stream"
        request_kwargs = {"data": _prepare_model_api_image(base64_image)}
    else:
        headers["Content-Type"] = "application/json"
        request_kwargs = {
            "json": {
                "inputs": base64_image,
                "parameters": {
                    "function_to_apply": "sigmoid",
                    "top_k": top_k,
                },
            }
        }

    started_at = time.time()
    try:
        response = requests.post(url, headers=headers, timeout=HF_TIMEOUT_SECONDS, **request_kwargs)
        elapsed_ms = round((time.time() - started_at) * 1000, 1)
    except requests.RequestException as exc:
        return {
            "role": role,
            "model": model_id,
            "available": False,
            "configured": True,
            "url_source": url_source,
            "warning": f"HF {role} model request failed: {_clean_error(str(exc))}",
            "predictions": [],
        }

    try:
        response_payload = response.json()
    except ValueError:
        response_payload = {"error": response.text[:300]}

    if not response.ok:
        error_text = response_payload.get("error") if isinstance(response_payload, dict) else response.text
        return {
            "role": role,
            "model": model_id,
            "available": False,
            "configured": True,
            "url_source": url_source,
            "http_status": response.status_code,
            "warning": f"HF {role} model returned HTTP {response.status_code}: {_clean_error(error_text)}",
            "predictions": [],
            "processing_ms": elapsed_ms,
        }

    predictions = _extract_predictions(response_payload)
    return {
        "role": role,
        "model": model_id,
        "available": True,
        "configured": True,
        "url_source": url_source,
        "predictions": predictions,
        "processing_ms": elapsed_ms,
    }


def _normalize_label(label: str) -> str:
    key = label.strip().lower().replace("-", " ").replace("_", " ")
    key = " ".join(key.split())
    if key in LABEL_ALIASES:
        return LABEL_ALIASES[key]

    for alias, canonical in LABEL_ALIASES.items():
        if alias.replace("_", " ") in key:
            return canonical

    return label.strip().replace("_", " ").title()


def _broad_findings(predictions: list[dict[str, Any]], source: str) -> list[dict[str, str]]:
    findings = []
    seen: set[str] = set()

    for prediction in predictions:
        label = _normalize_label(str(prediction.get("label", "")))
        score = float(prediction.get("score") or 0)

        if (
            label == "Normal"
            or label in NON_DISEASE_LABELS
            or label in seen
            or score < BROAD_FINDING_THRESHOLD
        ):
            continue

        seen.add(label)
        findings.append({
            "label": label,
            "status": "Detected",
            "category": "broad_disease",
            "source": source,
        })

    order_index = {label: index for index, label in enumerate(BROAD_LABEL_ORDER)}
    findings.sort(key=lambda item: order_index.get(item["label"], 999))
    return findings


def _tb_findings(predictions: list[dict[str, Any]], source: str) -> tuple[list[dict[str, str]], str | None]:
    positive_score = 0.0
    gray_zone = False

    for prediction in predictions:
        raw_label = str(prediction.get("label", "")).strip().lower()
        score = float(prediction.get("score") or 0)
        is_positive_label = (
            raw_label in {"1", "label_1", "positive", "abnormal"}
            or any(marker in raw_label for marker in ("tuberculosis", "turberculosis"))
            or raw_label == "tb"
        )
        is_negative_label = (
            raw_label in {"0", "label_0", "negative", "normal"}
            or "normal" in raw_label
        )

        if is_positive_label and not is_negative_label:
            positive_score = max(positive_score, score)

    if positive_score == 0 and len(predictions) == 1:
        positive_score = float(predictions[0].get("score") or 0)

    if 0.15 <= positive_score < TB_FINDING_THRESHOLD:
        gray_zone = True

    if positive_score >= TB_FINDING_THRESHOLD:
        return ([{
            "label": "Tuberculosis",
            "status": "Detected",
            "category": "tb_screening",
            "source": source,
        }], None)

    if gray_zone:
        return [], "TB screening model returned a review-zone signal."

    return [], None


def analyze_external_xray_models(base64_image: str) -> dict[str, Any]:
    broad_status = _call_hf_image_model(
        base64_image=base64_image,
        model_id=BROAD_MODEL_ID,
        endpoint_env="HF_BROAD_XRAY_ENDPOINT_URL",
        role="broad_disease",
        top_k=20,
    )
    broad_fallback_status = None
    if not broad_status.get("available") and _local_torchxrayvision_enabled():
        broad_fallback_status = _call_local_torchxrayvision(base64_image)
        if broad_fallback_status.get("available"):
            broad_status = broad_fallback_status

    broad_space_status = None
    if not broad_status.get("available") and _space_api_enabled() and BROAD_SPACE_URL.strip():
        broad_space_status = _call_gradio_space(
            base64_image=base64_image,
            space_url=BROAD_SPACE_URL,
            api_name=BROAD_SPACE_API_NAME,
            role="broad_disease",
            threshold=max(0.1, min(0.9, BROAD_FINDING_THRESHOLD)),
        )
        if broad_space_status.get("available"):
            broad_status = broad_space_status

    tb_status = _call_hf_image_model(
        base64_image=base64_image,
        model_id=TB_MODEL_ID,
        endpoint_env="HF_TB_XRAY_ENDPOINT_URL",
        role="tb_screening",
        top_k=5,
    )
    tb_space_status = None
    if not tb_status.get("available") and _space_api_enabled() and TB_SPACE_URL.strip():
        tb_space_status = _call_gradio_space(
            base64_image=base64_image,
            space_url=TB_SPACE_URL,
            api_name=TB_SPACE_API_NAME,
            role="tb_screening",
        )
        if tb_space_status.get("available"):
            tb_status = tb_space_status

    tb_local_status = None
    if not tb_status.get("available") and _local_mobilevit_enabled():
        tb_local_status = _call_local_mobilevit_xray(base64_image)
        if tb_local_status.get("available"):
            tb_status = tb_local_status

    broad_findings = _broad_findings(
        broad_status.get("predictions", []),
        str(broad_status.get("model") or BROAD_MODEL_ID),
    )
    tb_findings, tb_warning = _tb_findings(
        tb_status.get("predictions", []),
        str(tb_status.get("model") or TB_MODEL_ID),
    )
    warnings = []
    for status in (broad_status, tb_status):
        warning = status.get("warning")
        if not status.get("configured") or not isinstance(warning, str) or not warning:
            continue
        if status.get("url_source") == "model_api" and status.get("http_status") in {400, 404}:
            continue
        warnings.append(warning)
    if tb_warning:
        warnings.append(tb_warning)

    broad_model_info = {
        key: value
        for key, value in broad_status.items()
        if key not in {"predictions"}
    }
    broad_attempts = []
    for attempt in (broad_space_status, broad_fallback_status):
        if attempt is None or attempt is broad_status:
            continue
        broad_attempts.append({
            key: value
            for key, value in attempt.items()
            if key not in {"predictions"}
        })
    if broad_attempts:
        broad_model_info["attempts"] = broad_attempts

    tb_attempts = []
    for attempt in (tb_space_status, tb_local_status):
        if attempt is None or attempt is tb_status:
            continue
        tb_attempts.append({
            key: value
            for key, value in attempt.items()
            if key not in {"predictions"}
        })
    tb_model_info = {
        key: value
        for key, value in tb_status.items()
        if key not in {"predictions"}
    }
    if tb_attempts:
        tb_model_info["attempts"] = tb_attempts

    return {
        "findings": broad_findings + tb_findings,
        "warnings": warnings,
        "models": {
            "broad_disease": broad_model_info,
            "tb_screening": tb_model_info,
        },
    }


def _format_local_label(label: str | None) -> str:
    if label == "BACTERIAL_PNEUMONIA":
        return "Bacterial Pneumonia"
    if label == "VIRAL_PNEUMONIA":
        return "Viral Pneumonia"
    if label == "NORMAL":
        return "Normal"
    return (label or "Unknown").replace("_", " ").title()


def _dedupe_findings(findings: list[dict[str, str]]) -> list[dict[str, str]]:
    deduped = []
    seen: set[str] = set()
    for finding in findings:
        label = finding.get("label", "").strip()
        if not label or label.lower() in seen:
            continue
        seen.add(label.lower())
        deduped.append(finding)
    return deduped


def fuse_xray_result(local_result: dict[str, Any], external_result: dict[str, Any]) -> dict[str, Any]:
    top_class = local_result.get("top_class")
    top_confidence = float(local_result.get("top_confidence") or 0)
    external_findings = list(external_result.get("findings") or [])
    external_labels = {finding.get("label") for finding in external_findings}
    broad_available = bool(
        external_result.get("models", {}).get("broad_disease", {}).get("available")
    )

    has_external_abnormality = any(
        finding.get("category") not in {"normal"}
        for finding in external_findings
    )
    has_pneumonia_support = any(label in PNEUMONIA_SUPPORT_LABELS for label in external_labels)

    local_pneumonia_strong = (
        top_class in LOCAL_PNEUMONIA_CLASSES and top_confidence >= LOCAL_PNEUMONIA_THRESHOLD
    )
    local_pneumonia_supported = local_pneumonia_strong and (
        not broad_available or has_pneumonia_support or not has_external_abnormality
    )
    local_normal_strong = (
        top_class == "NORMAL"
        and top_confidence >= LOCAL_NORMAL_THRESHOLD
        and not has_external_abnormality
    )

    display_findings: list[dict[str, str]] = []
    pneumonia_signal = {
        "status": "not_detected",
        "label": None,
        "source": "local_pneumonia_model",
    }

    if local_pneumonia_supported:
        local_label = _format_local_label(str(top_class))
        display_findings.append({
            "label": local_label,
            "status": "Detected",
            "category": "pneumonia_subtype",
            "source": "local_pneumonia_model",
        })
        pneumonia_signal = {
            "status": "detected",
            "label": local_label,
            "source": "local_pneumonia_model",
        }
    elif top_class in LOCAL_PNEUMONIA_CLASSES:
        pneumonia_signal = {
            "status": "uncertain",
            "label": _format_local_label(str(top_class)),
            "source": "local_pneumonia_model",
        }

    for finding in external_findings:
        if finding.get("label") == "Pneumonia" and local_pneumonia_supported:
            continue
        if (
            local_pneumonia_supported
            and finding.get("category") == "broad_disease"
            and finding.get("label") not in PNEUMONIA_SUPPORT_LABELS
        ):
            continue
        display_findings.append(finding)

    if not display_findings and local_normal_strong:
        display_findings.append({
            "label": "Normal",
            "status": "No high-confidence abnormal finding",
            "category": "normal",
            "source": "local_pneumonia_model",
        })

    display_findings = _dedupe_findings(display_findings)

    if display_findings:
        abnormal_findings = [
            finding for finding in display_findings if finding.get("category") != "normal"
        ]
        if abnormal_findings:
            status_class = "abnormal"
            summary_label = (
                abnormal_findings[0]["label"]
                if len(abnormal_findings) == 1
                else "Multiple X-ray findings detected"
            )
            summary_text = "AI detected radiological findings. Correlate with clinical exam and radiology review."
        else:
            status_class = "normal"
            summary_label = "No acute abnormality detected"
            summary_text = "No high-confidence abnormal finding was detected by the configured X-ray models."
    else:
        status_class = "uncertain"
        summary_label = "No confident X-ray finding"
        summary_text = (
            "The local 3-class model did not cross the display threshold, and no configured broad/TB "
            "model finding was returned."
        )

    warnings = list(external_result.get("warnings") or [])
    if pneumonia_signal["status"] == "uncertain":
        warnings.append(
            "Local pneumonia subtype model was not shown because the pneumonia-specific signal was not strong enough."
        )
    if status_class == "uncertain":
        warnings.append("Review the image clinically or configure the broad/TB X-ray endpoints for wider coverage.")

    fused = {
        **local_result,
        "display_findings": display_findings,
        "status_class": status_class,
        "summary_label": summary_label,
        "summary_text": summary_text,
        "pneumonia_signal": pneumonia_signal,
        "external_models": external_result.get("models", {}),
        "warnings": warnings,
        "low_confidence": bool(local_result.get("low_confidence")) or status_class == "uncertain",
    }
    return fused


def build_xray_diagnostic_result(base64_image: str, local_result: dict[str, Any]) -> dict[str, Any]:
    external_result = analyze_external_xray_models(base64_image)
    return fuse_xray_result(local_result, external_result)


def get_external_xray_info() -> dict[str, Any]:
    broad_url, broad_source = _resolve_model_url(BROAD_MODEL_ID, "HF_BROAD_XRAY_ENDPOINT_URL")
    tb_url, tb_source = _resolve_model_url(TB_MODEL_ID, "HF_TB_XRAY_ENDPOINT_URL")

    return {
        "enabled": _env_bool("ENABLE_HF_XRAY", True),
        "hf_token_configured": bool(_auth_headers().get("Authorization")),
        "broad_disease": {
            "model": BROAD_MODEL_ID,
            "endpoint_configured": bool(broad_url),
            "url_source": broad_source,
            "threshold": BROAD_FINDING_THRESHOLD,
            "hf_space_enabled": _space_api_enabled(),
            "hf_space_url": _normalize_space_root(BROAD_SPACE_URL) if BROAD_SPACE_URL.strip() else None,
            "local_fallback_enabled": _local_torchxrayvision_enabled(),
            "local_fallback_model": LOCAL_TXRV_MODEL,
        },
        "tb_screening": {
            "model": TB_MODEL_ID,
            "endpoint_configured": bool(tb_url),
            "url_source": tb_source,
            "threshold": TB_FINDING_THRESHOLD,
            "hf_space_enabled": _space_api_enabled() and bool(TB_SPACE_URL.strip()),
            "hf_space_url": _normalize_space_root(TB_SPACE_URL) if TB_SPACE_URL.strip() else None,
            "local_fallback_enabled": _local_mobilevit_enabled(),
            "local_fallback_model": LOCAL_MOBILEVIT_XRAY_MODEL,
        },
    }
