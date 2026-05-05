import io
import mimetypes
import os
import re
import uuid
from typing import Iterable

import pytesseract
from PIL import Image

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
ALLOW_TESSERACT_FALLBACK = os.getenv("ALLOW_TESSERACT_OCR_FALLBACK", "").lower() == "true"


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

    return response.full_text_annotation.text or ""


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
        bitmap = page.render(scale=2).to_pil()
        buffer = io.BytesIO()
        bitmap.save(buffer, format="PNG")
        yield buffer.getvalue()


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
            return _extract_text_from_image(client, file_content), "Medical Image"
        elif api_key:
            return _extract_text_via_rest(api_key, file_content), "Medical Image"
        else:
            raise RuntimeError("google-cloud-vision is not installed and no API key provided for REST.")

    raise RuntimeError(f"Unsupported clinical document type: {mime_type}")


def _extract_text_with_tesseract(file_content: bytes) -> str:
    image = Image.open(io.BytesIO(file_content))
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


def extract_clinical_fields(raw_text: str) -> dict[str, object]:
    text = _normalize_text(raw_text)
    excerpt = text[:700]
    chief_labels = [
        "chief complaint",
        "complaint",
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

    chief_complaint = (
        _extract_from_lines(raw_text, chief_labels, 260)
        or _extract_after_label(text, chief_labels, 260)
    )
    medical_history = (
        _extract_from_lines(raw_text, history_labels, 420)
        or _extract_after_label(text, history_labels, 420)
    )
    medications = (
        _extract_from_lines(raw_text, medication_labels, 260)
        or _extract_after_label(text, medication_labels, 260)
    )

    return {
        "chief_complaint": chief_complaint,
        "medical_history": medical_history,
        "current_medications": medications,
        "vitals": _extract_vitals(text),
        "document_excerpt": excerpt,
    }


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
        clinical_fields.get("chief_complaint")
        or clinical_fields.get("medical_history")
        or clinical_fields.get("document_excerpt")
        or _normalize_text(raw_text)
    )
    summary = (
        f"{summary_source[:240]}..."
        if summary_source.strip()
        else f"OCR completed for {file_name}, but no text was extracted."
    )

    return {
        "success": True,
        "document_id": str(uuid.uuid4()),
        "document_type": document_type,
        "extracted_biomarkers": [],
        "ai_summary": summary,
        "raw_text": raw_text,
        "clinical_fields": clinical_fields,
        "confidence_score": None,
        "ocr_engine": ocr_engine,
    }

