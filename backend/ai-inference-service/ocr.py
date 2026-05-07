import io
import json
import mimetypes
import os
import re
import uuid
from typing import Any, Iterable

import pytesseract
from PIL import Image, ImageFilter, ImageOps

import requests

try:
    from google.cloud import vision
except ImportError:
    vision = None

try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None


TESSERACT_CMD = os.getenv("TESSERACT_CMD", "").strip()
if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

MAX_PDF_PAGES = int(os.getenv("GOOGLE_VISION_MAX_PDF_PAGES", "5"))
PDF_RENDER_SCALE = float(os.getenv("OCR_PDF_RENDER_SCALE", "3"))
ALLOW_TESSERACT_FALLBACK = os.getenv("ALLOW_TESSERACT_OCR_FALLBACK", "").lower() == "true"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_OCR_MODEL = os.getenv("GROQ_OCR_MODEL", "llama-3.3-70b-versatile").strip()
ENABLE_AI_FIELD_EXTRACTION = os.getenv("ENABLE_AI_FIELD_EXTRACTION", "true").lower() != "false"


def _guess_mime_type(file_name: str) -> str:
    guessed, _ = mimetypes.guess_type(file_name)
    return guessed or "application/octet-stream"


def _get_vision_client():
    if vision is None:
        raise RuntimeError("google-cloud-vision is not installed. Run pip install -r requirements.txt.")

    api_key = os.getenv("GOOGLE_CLOUD_VISION_API_KEY") or os.getenv("GOOGLE_VISION_API_KEY")
    if api_key:
        return vision.ImageAnnotatorClient(client_options={"api_key": api_key})

    return vision.ImageAnnotatorClient()


def _extract_text_from_image(client, image_content: bytes) -> str:
    image = vision.Image(content=image_content)
    response = client.document_text_detection(image=image)

    if response.error.message:
        raise RuntimeError(response.error.message)

    full_text = response.full_text_annotation.text or ""
    if full_text.strip():
        return full_text

    if response.text_annotations:
        return response.text_annotations[0].description or ""

    return ""


def _render_pdf_pages(file_content: bytes) -> Iterable[bytes]:
    global pdfium

    if pdfium is None:
        try:
            import pypdfium2 as loaded_pdfium
            pdfium = loaded_pdfium
        except ImportError:
            raise RuntimeError("PDF OCR requires pypdfium2. Run pip install -r requirements.txt.")

    document = pdfium.PdfDocument(file_content)
    page_count = min(len(document), MAX_PDF_PAGES)

    for index in range(page_count):
        page = document[index]
        bitmap = page.render(scale=PDF_RENDER_SCALE).to_pil()
        buffer = io.BytesIO()
        bitmap.save(buffer, format="PNG")
        yield buffer.getvalue()


def _enhance_image_for_ocr(image_content: bytes) -> bytes:
    image = Image.open(io.BytesIO(image_content))
    image = ImageOps.exif_transpose(image).convert("L")
    image = ImageOps.autocontrast(image)

    if min(image.size) < 1200:
        scale = min(3, max(2, round(1200 / max(min(image.size), 1))))
        image = image.resize((image.width * scale, image.height * scale), Image.Resampling.LANCZOS)

    image = image.filter(ImageFilter.SHARPEN)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _extract_text_via_rest(api_key: str, image_content: bytes) -> str:
    import base64
    url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
    b64_img = base64.b64encode(image_content).decode("utf-8")
    payload = {
        "requests": [
            {
                "image": {"content": b64_img},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]
            }
        ]
    }
    resp = requests.post(url, json=payload, timeout=30)
    if not resp.ok:
        raise RuntimeError(f"Vision REST API Error {resp.status_code}: {resp.text}")
    
    data = resp.json()
    if "error" in data.get("responses", [{}])[0]:
        raise RuntimeError(data["responses"][0]["error"]["message"])
        
    return data["responses"][0].get("fullTextAnnotation", {}).get("text", "")


def _extract_text_with_google_vision(file_name: str, file_content: bytes) -> tuple[str, str]:
    mime_type = _guess_mime_type(file_name)
    api_key = os.getenv("GOOGLE_CLOUD_VISION_API_KEY") or os.getenv("GOOGLE_VISION_API_KEY")

    if mime_type == "application/pdf" or file_name.lower().endswith(".pdf"):
        page_texts = []
        for page_content in _render_pdf_pages(file_content):
            if vision is not None:
                client = _get_vision_client()
                page_texts.append(_extract_text_from_image(client, page_content))
            elif api_key:
                page_texts.append(_extract_text_via_rest(api_key, page_content))
            else:
                raise RuntimeError("google-cloud-vision is not installed and no API key provided for REST.")
                
        return "\n\n".join(text for text in page_texts if text.strip()), "PDF Document"

    if mime_type.startswith("image/"):
        if vision is not None:
            client = _get_vision_client()
            original_text = _extract_text_from_image(client, file_content)
            if len(_normalize_text(original_text)) >= 40:
                return original_text, "Medical Image"

            try:
                enhanced_text = _extract_text_from_image(client, _enhance_image_for_ocr(file_content))
                if len(_normalize_text(enhanced_text)) > len(_normalize_text(original_text)):
                    return enhanced_text, "Medical Image"
            except Exception as enhance_error:
                print(f"OCR enhancement skipped: {enhance_error}")

            return original_text, "Medical Image"
        elif api_key:
            original_text = _extract_text_via_rest(api_key, file_content)
            if len(_normalize_text(original_text)) >= 40:
                return original_text, "Medical Image"

            try:
                enhanced_text = _extract_text_via_rest(api_key, _enhance_image_for_ocr(file_content))
                if len(_normalize_text(enhanced_text)) > len(_normalize_text(original_text)):
                    return enhanced_text, "Medical Image"
            except Exception as enhance_error:
                print(f"OCR enhancement skipped: {enhance_error}")

            return original_text, "Medical Image"
        else:
            raise RuntimeError("google-cloud-vision is not installed and no API key provided for REST.")

    raise RuntimeError(f"Unsupported clinical document type: {mime_type}")


def _extract_text_with_tesseract(file_content: bytes) -> str:
    image = Image.open(io.BytesIO(_enhance_image_for_ocr(file_content)))
    return pytesseract.image_to_string(image)


def _normalize_text(raw_text: str) -> str:
    return re.sub(r"\s+", " ", raw_text).strip()


def _clean_extracted_value(value: str, max_chars: int) -> str:
    cleaned = re.sub(r"[_|]+", " ", value)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" :-")
    return cleaned[:max_chars].strip()


def _label_regex(label: str) -> re.Pattern[str]:
    escaped_label = re.escape(label).replace(r"\ ", r"\s+")
    return re.compile(rf"\b{escaped_label}\b\s*[:\-]?\s*(.*)", re.IGNORECASE)


def _extract_from_lines(raw_text: str, labels: list[str], max_chars: int) -> str:
    lines = [line.strip() for line in re.split(r"[\r\n]+", raw_text) if line.strip()]

    for index, line in enumerate(lines):
        for label in labels:
            match = _label_regex(label).search(line)
            if not match:
                continue

            value = _clean_extracted_value(match.group(1), max_chars)
            if value and value.lower() != label.lower():
                return value

            continuation: list[str] = []
            for next_line in lines[index + 1:index + 4]:
                if any(_label_regex(next_label).search(next_line) for next_label in labels):
                    break
                continuation.append(next_line)

            combined = _clean_extracted_value(" ".join(continuation), max_chars)
            if combined:
                return combined

    return ""


def _extract_after_label(text: str, labels: list[str], max_chars: int = 260) -> str:
    for label in labels:
        pattern = re.compile(rf"{label}\s*[:\-]?\s*(.+?)(?=\s+[A-Z][A-Za-z /]{{2,30}}\s*[:\-]|$)", re.IGNORECASE)
        match = pattern.search(text)
        if match:
            return _clean_extracted_value(match.group(1), max_chars)
    return ""


def _extract_prefixed_line(raw_text: str, prefixes: list[str], max_chars: int = 260) -> str:
    stop_prefixes = [
        r"c\s*/?\s*o",
        r"h\s*/?\s*o",
        r"rx",
        r"dx",
        r"diagnosis",
        r"advice",
        r"follow\s*up",
        r"bp",
        r"pulse",
        r"temp",
        r"spo2",
    ]
    stop_pattern = re.compile(rf"^\s*(?:{'|'.join(stop_prefixes)})\b", re.IGNORECASE)
    lines = [line.strip() for line in re.split(r"[\r\n]+", raw_text) if line.strip()]

    for index, line in enumerate(lines):
        for prefix in prefixes:
            match = re.search(rf"^\s*(?:{prefix})\s*[:\-]?\s*(.+)$", line, re.IGNORECASE)
            if not match:
                continue

            value_parts = [match.group(1)]
            for next_line in lines[index + 1:index + 3]:
                if stop_pattern.search(next_line):
                    break
                value_parts.append(next_line)

            value = _clean_extracted_value(" ".join(value_parts), max_chars)
            if value:
                return value

    return ""


def _extract_vitals(text: str) -> dict[str, str]:
    vitals: dict[str, str] = {}
    patterns = {
        "bp": r"\b(?:BP|blood pressure)\s*[:\-]?\s*(\d{2,3}\s*/\s*\d{2,3})",
        "pulse": r"\b(?:pulse|heart rate|HR)\s*[:\-]?\s*(\d{2,3})",
        "temperature": r"\b(?:temp|temperature)\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)",
        "spo2": r"\b(?:spo2|oxygen saturation|o2 sat)\s*[:\-]?\s*(\d{2,3})",
        "weight": r"\b(?:weight|wt)\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)",
        "rbs": r"\b(?:rbs|random blood sugar|glucose)\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)",
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            vitals[key] = re.sub(r"\s+", "", match.group(1))

    return vitals


def _extract_labs(text: str) -> list[dict[str, str]]:
    lab_patterns = {
        "Hemoglobin": r"\b(?:hb|hgb|hemoglobin)\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*(g/?dL|gm%|g%)?",
        "WBC": r"\b(?:wbc|white blood cells?|tlc)\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:x?\s*10\^?3|k|/cmm|/uL)?",
        "Platelets": r"\b(?:platelets?|plt)\s*[:\-]?\s*(\d{1,4}(?:\.\d+)?)\s*(?:lakh|k|x?\s*10\^?3|/cmm|/uL)?",
        "Creatinine": r"\b(?:creatinine|s\.?\s*creatinine)\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*(mg/?dL)?",
        "Urea": r"\b(?:urea|blood urea)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*(mg/?dL)?",
        "RBS": r"\b(?:rbs|random blood sugar|glucose)\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(mg/?dL)?",
        "CRP": r"\b(?:crp|c-reactive protein)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*(mg/?L|mg/?dL)?",
        "ESR": r"\b(?:esr)\s*[:\-]?\s*(\d{1,3})\s*(mm/hr)?",
    }

    labs: list[dict[str, str]] = []
    seen: set[str] = set()

    for name, pattern in lab_patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if not match or name in seen:
            continue
        seen.add(name)
        labs.append({
            "parameter": name,
            "value": match.group(1),
            "unit": match.group(2) or "",
        })

    return labs


def _extract_biomarkers(text: str) -> list[dict[str, str]]:
    biomarkers = []
    for lab in _extract_labs(text):
        biomarkers.append({
            "parameter": lab["parameter"],
            "value": lab["value"],
            "unit": lab.get("unit", ""),
            "range": "",
            "flag": "NORMAL",
        })
    return biomarkers


def _coerce_string(value: Any, max_chars: int = 700) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value if str(item).strip())
    if isinstance(value, dict):
        value = "; ".join(f"{k}: {v}" for k, v in value.items() if str(v).strip())
    return _clean_extracted_value(str(value), max_chars)


def _parse_json_object(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?", "", raw, flags=re.IGNORECASE).strip()
    raw = re.sub(r"```$", "", raw).strip()

    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return {}
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}


def _extract_fields_with_ai(raw_text: str, rule_fields: dict[str, Any]) -> dict[str, Any]:
    if not ENABLE_AI_FIELD_EXTRACTION or not GROQ_API_KEY or len(_normalize_text(raw_text)) < 20:
        return {}

    text_for_model = raw_text[:6000]
    prompt = f"""
You are MedCoPilot's clinical document extraction engine.
Extract structured data from OCR text of an Indian doctor prescription, discharge note, lab report, or handwritten OPD note.

Rules:
- Return only valid JSON. No markdown.
- Do not invent facts. If a field is unclear, use an empty string.
- For handwritten/noisy OCR, infer only obvious clinical phrases and put uncertainty in handwriting_notes.
- Preserve medication names, dose, frequency, and duration exactly when visible.
- Keep content concise and doctor-facing.

JSON schema:
{{
  "chief_complaint": "",
  "medical_history": "",
  "current_medications": "",
  "provisional_diagnosis": "",
  "advice": "",
  "follow_up": "",
  "vitals": {{"bp": "", "pulse": "", "temperature": "", "spo2": "", "weight": "", "rbs": ""}},
  "labs": [{{"parameter": "", "value": "", "unit": ""}}],
  "structured_summary": "",
  "handwriting_notes": "",
  "source_quality": "clear|partial|poor",
  "confidence_score": 0.0
}}

Regex candidates already found:
{json.dumps(rule_fields, ensure_ascii=False)}

OCR text:
{text_for_model}
""".strip()

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_OCR_MODEL,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": "You extract structured clinical fields from OCR text and return strict JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=25,
        )
        if not response.ok:
            raise RuntimeError(f"Groq OCR structuring failed with HTTP {response.status_code}: {response.text[:240]}")

        content = response.json()["choices"][0]["message"]["content"]
        parsed = _parse_json_object(content)
    except Exception as error:
        print(f"AI OCR field extraction skipped: {error}")
        return {}

    fields: dict[str, Any] = {}
    for key in [
        "chief_complaint",
        "medical_history",
        "current_medications",
        "provisional_diagnosis",
        "advice",
        "follow_up",
        "structured_summary",
        "handwriting_notes",
        "source_quality",
    ]:
        fields[key] = _coerce_string(parsed.get(key), 900)

    vitals = parsed.get("vitals") if isinstance(parsed.get("vitals"), dict) else {}
    fields["vitals"] = {
        key: _coerce_string(value, 40)
        for key, value in vitals.items()
        if _coerce_string(value, 40)
    }

    labs = parsed.get("labs")
    if isinstance(labs, list):
        fields["labs"] = [
            {
                "parameter": _coerce_string(item.get("parameter"), 80),
                "value": _coerce_string(item.get("value"), 80),
                "unit": _coerce_string(item.get("unit"), 40),
            }
            for item in labs
            if isinstance(item, dict) and _coerce_string(item.get("parameter"), 80)
        ][:20]

    try:
        confidence = float(parsed.get("confidence_score", 0) or 0)
    except (TypeError, ValueError):
        confidence = 0
    fields["confidence_score"] = max(0, min(confidence, 1))

    return fields


def _merge_clinical_fields(rule_fields: dict[str, Any], ai_fields: dict[str, Any]) -> dict[str, Any]:
    merged = dict(rule_fields)

    for key in [
        "chief_complaint",
        "medical_history",
        "current_medications",
        "provisional_diagnosis",
        "advice",
        "follow_up",
        "structured_summary",
        "handwriting_notes",
        "source_quality",
    ]:
        value = _coerce_string(ai_fields.get(key), 900)
        if value:
            merged[key] = value

    vitals = {}
    if isinstance(rule_fields.get("vitals"), dict):
        vitals.update(rule_fields["vitals"])
    if isinstance(ai_fields.get("vitals"), dict):
        vitals.update({k: v for k, v in ai_fields["vitals"].items() if str(v).strip()})
    merged["vitals"] = vitals

    labs = ai_fields.get("labs") or rule_fields.get("labs") or []
    merged["labs"] = labs if isinstance(labs, list) else []

    confidence = ai_fields.get("confidence_score")
    if isinstance(confidence, (int, float)) and confidence > 0:
        merged["confidence_score"] = confidence

    return merged


def extract_clinical_fields(raw_text: str) -> dict[str, object]:
    text = _normalize_text(raw_text)
    excerpt = text[:700]
    chief_labels = [
        "chief complaint",
        "complaint",
        "complaints",
        "complains of",
        "complaint of",
        "presenting complaint",
        "reason for visit",
        "symptoms",
        "patient concerns",
        "medical condition",
        "condition",
        "diagnosis",
    ]
    history_labels = [
        "medical history",
        "history",
        "past history",
        "clinical history",
        "medical report",
        "comments",
        "remarks",
        "doctor comments",
        "physician comments",
        "provider comments",
    ]
    medication_labels = [
        "current medications",
        "medications",
        "medicine",
        "medicines",
        "prescriptions",
        "rx",
        "drugs",
    ]
    diagnosis_labels = ["diagnosis", "provisional diagnosis", "assessment", "impression", "dx"]
    advice_labels = ["advice", "plan", "treatment plan", "instructions"]
    follow_up_labels = ["follow up", "follow-up", "review", "next visit"]

    chief_complaint = (
        _extract_prefixed_line(raw_text, [r"c\s*/?\s*o", r"complains?\s+of"], 260)
        or
        _extract_from_lines(raw_text, chief_labels, 260)
        or _extract_after_label(text, chief_labels, 260)
    )
    medical_history = (
        _extract_prefixed_line(raw_text, [r"h\s*/?\s*o", r"history\s+of"], 420)
        or
        _extract_from_lines(raw_text, history_labels, 420)
        or _extract_after_label(text, history_labels, 420)
    )
    medications = (
        _extract_prefixed_line(raw_text, [r"rx", r"treatment"], 360)
        or
        _extract_from_lines(raw_text, medication_labels, 260)
        or _extract_after_label(text, medication_labels, 260)
    )
    provisional_diagnosis = (
        _extract_prefixed_line(raw_text, [r"dx", r"diagnosis", r"impression"], 260)
        or _extract_from_lines(raw_text, diagnosis_labels, 260)
        or _extract_after_label(text, diagnosis_labels, 260)
    )
    advice = (
        _extract_prefixed_line(raw_text, [r"advice", r"plan"], 360)
        or _extract_from_lines(raw_text, advice_labels, 360)
        or _extract_after_label(text, advice_labels, 360)
    )
    follow_up = (
        _extract_prefixed_line(raw_text, [r"follow\s*up", r"review"], 180)
        or _extract_from_lines(raw_text, follow_up_labels, 180)
        or _extract_after_label(text, follow_up_labels, 180)
    )

    rule_fields: dict[str, Any] = {
        "chief_complaint": chief_complaint,
        "medical_history": medical_history,
        "current_medications": medications,
        "provisional_diagnosis": provisional_diagnosis,
        "advice": advice,
        "follow_up": follow_up,
        "vitals": _extract_vitals(text),
        "labs": _extract_labs(text),
        "document_excerpt": excerpt,
    }

    ai_fields = _extract_fields_with_ai(raw_text, rule_fields)
    merged = _merge_clinical_fields(rule_fields, ai_fields)
    merged["document_excerpt"] = excerpt
    return merged


def process_lab_report(file_name: str, file_content: bytes = b""):
    """
    Extracts clinical text from uploaded images/PDFs using Google Cloud Vision.
    PDF files are rendered page-by-page locally, then each page image is sent
    through Vision document text detection.
    """
    try:
        raw_text, document_type = _extract_text_with_google_vision(file_name, file_content)
        ocr_engine = "google_vision"
    except Exception as vision_error:
        if not ALLOW_TESSERACT_FALLBACK:
            print(f"Google Vision OCR Error: {vision_error}")
            return {"success": False, "error": str(vision_error)}

        try:
            raw_text = _extract_text_with_tesseract(file_content)
            document_type = "Medical Image"
            ocr_engine = "tesseract_fallback"
        except Exception as fallback_error:
            print(f"OCR Error: {fallback_error}")
            return {"success": False, "error": f"{vision_error}; fallback failed: {fallback_error}"}

    clinical_fields = extract_clinical_fields(raw_text)
    summary_source = str(
        clinical_fields.get("structured_summary")
        or clinical_fields.get("chief_complaint")
        or clinical_fields.get("provisional_diagnosis")
        or clinical_fields.get("medical_history")
        or clinical_fields.get("document_excerpt")
        or _normalize_text(raw_text)
    )
    summary = (
        f"{summary_source[:240]}..."
        if summary_source.strip()
        else f"OCR completed for {file_name}, but no text was extracted."
    )
    confidence_score = clinical_fields.get("confidence_score")
    if not isinstance(confidence_score, (int, float)) or confidence_score <= 0:
        normalized_len = len(_normalize_text(raw_text))
        populated = sum(
            1
            for key in ["chief_complaint", "medical_history", "current_medications", "provisional_diagnosis"]
            if str(clinical_fields.get(key) or "").strip()
        )
        confidence_score = min(0.92, 0.35 + (0.1 * populated) + min(normalized_len / 2000, 0.25))

    return {
        "success": True,
        "document_id": str(uuid.uuid4()),
        "document_type": document_type,
        "extracted_biomarkers": _extract_biomarkers(_normalize_text(raw_text)),
        "ai_summary": summary,
        "raw_text": raw_text,
        "clinical_fields": clinical_fields,
        "confidence_score": round(float(confidence_score), 2),
        "ocr_engine": ocr_engine,
    }

