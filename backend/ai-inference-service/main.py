import os
import json
import time
import asyncio
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

# Load .env from the Next.js root folder before importing runtime clients.
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from agents import (
    run_diagnostic_pipeline,
    create_patient_node,
    upsert_patient_context,
    delete_patient,
    canonicalize_drug_name,
    check_drug_interactions,
    search_drug_catalog,
    build_checker_fallback_interactions,
    ensure_drug_graph_seeded,
    get_drug_graph_stats,
    driver,
)
from analytics import get_forecast as build_forecast
from ocr import process_lab_report
import xray_inference as xray_engine

XRAY_LOG_FILE = Path(__file__).parent / "models" / "xray_request_log.json"

@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await ensure_drug_graph_seeded()
    except Exception as e:
        print(f"Neo4j warmup error: {e}")

    yield

    if driver:
        await driver.close()


app = FastAPI(title="MedCoPilot AI Inference Service", lifespan=lifespan)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    visit_id: str
    clinical_context: str


class DrugCheckRequest(BaseModel):
    drugs: list[str]

@app.post("/ai/analyze")
async def analyze_visit(request: AnalyzeRequest):
    """
    HTTP POST that streams events back to the client using SSE.
    """
    async def event_generator():
        try:
            yield {"event": "thinking", "data": json.dumps({"message": "Connecting to AI inference engine...", "step": 1})}
            await asyncio.sleep(0.5)
            
            async for event in run_diagnostic_pipeline(request.clinical_context):
                yield event
                
            yield {"event": "complete", "data": json.dumps({"visit_id": request.visit_id})}
            
        except Exception as e:
            print(f"Error during analysis: {e}")
            yield {"event": "error", "data": json.dumps({"message": str(e)})}

    return EventSourceResponse(event_generator())

@app.get("/ai/forecast")
async def get_forecast(topic: str = "General Patient Volume", days: int = 30):
    """
    Returns AI predictive forecasting bounds when a forecasting backend is connected.
    """
    try:
        data = build_forecast(disease_topic=topic, days_ahead=days)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/ocr")
async def ocr_upload(file: UploadFile = File(...)):
    """
    Accepts a medical document upload and extracts text with Google Vision OCR.
    """
    try:
        content = await file.read()
        res = process_lab_report(file_name=file.filename, file_content=content)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/add-patient")
async def add_patient_onboarding(
    file: UploadFile = File(...),
    name: str = Form(...),
    age: int = Form(...),
    sex: str = Form(...)
):
    """
    Unified clinical onboarding: 
    1. Parse report via OCR.
    2. Store Patient profile in Neo4j.
    3. Index clinical context in Qdrant for RAG.
    """
    try:
        content = await file.read()
        patient_id = f"PAT-{uuid.uuid4().hex[:6].upper()}"
        warning = None
        
        # 1. OCR Extraction
        ocr_res = process_lab_report(file_name=file.filename, file_content=content)
        if ocr_res.get("success"):
            clinical_text = ocr_res.get("raw_text", "No clinical text found")
            summary = ocr_res.get("ai_summary")
            document_id = ocr_res.get("document_id")
            clinical_fields = ocr_res.get("clinical_fields", {})
        else:
            ocr_error = ocr_res.get("error", "OCR extraction unavailable")
            clinical_text = ""
            summary = "Document uploaded, but OCR could not extract clinical text."
            document_id = str(uuid.uuid4())
            clinical_fields = {}
            warning = f"OCR unavailable: {ocr_error}"

        # 2. Parallel Persistence
        await asyncio.gather(
            create_patient_node(patient_id, name, age, sex),
            upsert_patient_context(patient_id, clinical_text)
        )

        return {
            "success": True, 
            "patient_id": patient_id, 
            "summary": summary,
            "document_id": document_id,
            "raw_text": clinical_text,
            "clinical_fields": clinical_fields,
            "ocr_engine": ocr_res.get("ocr_engine"),
            "warning": warning
        }
    except Exception as e:
        print(f"Onboarding Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/ai/patient/{patient_id}")
async def remove_patient_data(patient_id: str):
    """
    Deletes patient record from Neo4j and Qdrant.
    """
    res = await delete_patient(patient_id)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error"))
    return {"success": True, "message": "Patient data deleted"}


@app.get("/ai/drugs/search")
async def search_drugs_endpoint(q: str = "", limit: int = 10):
    try:
        matches = await search_drug_catalog(q, limit=min(max(limit, 1), 20))
        return {"success": True, "data": matches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/drugs/check")
async def check_drug_interactions_endpoint(request: DrugCheckRequest):
    try:
        graph_status = await ensure_drug_graph_seeded()
        drugs = []
        seen: set[str] = set()
        for drug in request.drugs:
            name = canonicalize_drug_name(drug)
            if not name:
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            drugs.append(name)

        if len(drugs) < 2:
            raise HTTPException(status_code=400, detail="At least two drugs are required")

        interactions = await check_drug_interactions(drugs)
        source = "neo4j" if graph_status["connected"] else "fallback"

        if not interactions and not graph_status["connected"]:
            interactions = build_checker_fallback_interactions(drugs)
            source = "fallback"

        pair_count = len(drugs) * (len(drugs) - 1) // 2

        return {
            "success": True,
            "data": {
                "drugs_checked": drugs,
                "pairs_analyzed": pair_count,
                "interactions": interactions,
                "safe_combinations": max(pair_count - len(interactions), 0),
                "source": source,
                "neo4j_connected": graph_status["connected"],
                "neo4j_seeded": graph_status["seeded"],
                "neo4j_drug_count": graph_status["drug_count"],
                "neo4j_interaction_count": graph_status["interaction_count"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ai/drugs/status")
async def drug_graph_status_endpoint():
    try:
        stats = await get_drug_graph_stats()
        return {"success": True, "data": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class XRayRequest(BaseModel):
    image: str   # base64-encoded PNG or JPG


@app.post("/ai/xray-predict")
async def xray_predict(request: XRayRequest):
    """
    Accepts a base64-encoded chest X-ray image and returns a 3-class
    classification: NORMAL / BACTERIAL_PNEUMONIA / VIRAL_PNEUMONIA.
    """
    import datetime
    t_start = time.time()

    result = xray_engine.predict_xray_disease(request.image)

    processing_ms = round((time.time() - t_start) * 1000, 1)

    # Append request log entry
    try:
        log_entry = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "top_class": result.get("top_class"),
            "top_confidence": result.get("top_confidence"),
            "low_confidence": result.get("low_confidence"),
            "processing_ms": processing_ms,
            "error": result.get("error"),
        }
        existing: list = []
        if XRAY_LOG_FILE.exists():
            with open(XRAY_LOG_FILE) as f:
                existing = json.load(f)
        existing.append(log_entry)
        XRAY_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(XRAY_LOG_FILE, "w") as f:
            json.dump(existing, f, indent=2)
    except Exception as log_err:
        print(f"[xray log] Failed to write log: {log_err}")

    if result.get("error") and result.get("top_class") is None:
        raise HTTPException(status_code=422, detail=result["error"])

    return {"success": True, "data": result}


@app.get("/ai/xray-health")
async def xray_health():
    """
    Demo proof-of-work endpoint: returns model loading status, architecture,
    parameter count, and training metrics.
    """
    info = xray_engine.get_model_info()
    return {"success": True, "data": info}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
