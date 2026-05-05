"""Root-level ASGI entrypoint for the AI inference service.

This lets `python -m uvicorn main:app --reload --port 8000` work from the
repository root while keeping the actual FastAPI code in backend/ai-inference-service.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


SERVICE_DIR = Path(__file__).resolve().parent / "backend" / "ai-inference-service"
SERVICE_MAIN = SERVICE_DIR / "main.py"

if not SERVICE_MAIN.exists():
    raise RuntimeError(f"AI inference service entrypoint not found: {SERVICE_MAIN}")

sys.path.insert(0, str(SERVICE_DIR))

spec = importlib.util.spec_from_file_location("medicopilot_ai_service", SERVICE_MAIN)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load AI inference service from: {SERVICE_MAIN}")

module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

app = module.app
