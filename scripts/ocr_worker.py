"""Persistent, always-warm OCR worker — loads all PaddleOCR/PaddleX models
ONCE at startup and serves subsequent requests over local HTTP, instead of
Node spawning a fresh `python <script>.py` subprocess (with a full model
reload from disk) for every single file. Same models, same weights, same
per-page routing as the CLI scripts (scripts/ocr_document.py,
scripts/ocr_layout_to_docx.py) — this is purely an infrastructure change,
not an accuracy one.

Confirmed no new dependency: fastapi + uvicorn are already installed as
transitive deps of paddlex[ocr].

Usage: python ocr_worker.py [--port 8877]
Prints "OCR worker ready on port <port>" to stdout once models are loaded
and the HTTP server is about to start listening — Node polls GET /health
rather than parsing this line, but it's useful for manual debugging.
"""
import sys
import threading
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from _ocr_common import (
    LazyModel,
    make_layout_detector,
    make_ocr,
    make_table_pipeline,
    ocr_document_pages,
    ocr_layout_docx_pages,
)
from ocr_layout_to_docx import write_docx
from ocr_layout_to_xlsx import write_xlsx

app = FastAPI()

# Built once, before the server starts accepting connections (see main()) —
# so a successful response from GET /health always means "actually ready
# to do inference", not "server up but still loading in the background".
_ocr = None
_layout_detector = None
_table_pipeline: Optional[LazyModel] = None

# Serializes all inference calls. Running two full pipelines concurrently on
# the same CPU (no GPU on this machine) fights over the same threads and
# roughly doubles peak RAM for no net throughput win — concurrent requests
# simply queue behind this lock rather than being rejected or corrupting
# each other's state.
_inference_lock = threading.Lock()


class OcrRequest(BaseModel):
    path: str
    pages: Optional[List[int]] = None


class OcrLayoutDocxRequest(BaseModel):
    path: str
    output_path: str
    pages: Optional[List[int]] = None


class OcrLayoutXlsxRequest(BaseModel):
    path: str
    output_path: str
    pages: Optional[List[int]] = None


@app.get("/health")
def health():
    return {"status": "ready"}


@app.post("/ocr")
def ocr(req: OcrRequest):
    with _inference_lock:
        try:
            pages = ocr_document_pages(_ocr, _layout_detector, _table_pipeline, req.path, req.pages)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:  # noqa: BLE001 — surface any inference failure as a clean 500, never crash the worker
            raise HTTPException(status_code=500, detail=str(e))
    return {"pages": pages}


@app.post("/ocr-layout-docx")
def ocr_layout_docx(req: OcrLayoutDocxRequest):
    with _inference_lock:
        try:
            pages_blocks = ocr_layout_docx_pages(_ocr, _layout_detector, _table_pipeline, req.path, req.pages)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(e))

        if not any(pages_blocks):
            raise HTTPException(status_code=422, detail="no text detected")

        try:
            write_docx(pages_blocks, req.output_path)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"failed to write docx: {e}")

    return {"ok": True}


@app.post("/ocr-layout-xlsx")
def ocr_layout_xlsx(req: OcrLayoutXlsxRequest):
    with _inference_lock:
        try:
            pages_blocks = ocr_layout_docx_pages(_ocr, _layout_detector, _table_pipeline, req.path, req.pages)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(e))

        if not any(pages_blocks):
            raise HTTPException(status_code=422, detail="no text detected")

        try:
            write_xlsx(pages_blocks, req.output_path)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"failed to write xlsx: {e}")

    return {"ok": True}


def main() -> int:
    port = 8877
    if "--port" in sys.argv:
        idx = sys.argv.index("--port")
        port = int(sys.argv[idx + 1])

    global _ocr, _layout_detector, _table_pipeline
    print("OCR worker: loading models (this happens once)...", flush=True)
    _ocr = make_ocr()
    _layout_detector = make_layout_detector()
    _table_pipeline = LazyModel(make_table_pipeline)
    print(f"OCR worker ready on port {port}", flush=True)

    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
    return 0


if __name__ == "__main__":
    sys.exit(main())
