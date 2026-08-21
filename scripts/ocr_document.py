"""Thin CLI wrapper around PaddleOCR for real scanned-document OCR
(no text layer PDFs, or plain images) — used when pdf-inspector/pdf-parse
can't extract text and the configured LLM may not have vision support.

The actual per-page routing/orchestration lives in _ocr_common.py
(ocr_document_pages()) so this script and the persistent worker
(ocr_worker.py) can't drift apart — this file just wires up a fresh set of
models for a single run and prints the result as JSON.

See _ocr_common.py for the model choice and rendering rationale.

Usage:
  python ocr_document.py <input.pdf|input.png|...> [--pages 0,2,5]

Prints JSON to stdout:
  {"pages": [{
    "page": 0,
    "text": "...",                 # reading-order text/markdown — reconstructed
                                    # from line positions (row/column clustering,
                                    # same as ocr_layout_to_docx.py), NOT
                                    # PaddleOCR's raw detection order, which for
                                    # dense multi-column forms/tables silently
                                    # scrambles field-label/value adjacency
    "lines": [{"text": "...", "box": [[x,y],...], "score": 0.98}, ...],
    "width_px": 1653, "height_px": 2339,
    "width_pt": 595.3, "height_pt": 841.9,
    "avgConfidence": 0.91, "lowConfidenceLines": 2, "sealsExcluded": 1,
    "usedTableRecognition": false   # true when the page was routed through
                                    # TableRecognitionPipelineV2 instead of
                                    # plain OCR + geometric clustering — a
                                    # trained model finding real cell/row/
                                    # column boundaries beats inferring them
                                    # from coordinate gaps on dense tables
  }]}
On failure, prints the traceback to stderr and exits non-zero.
"""
import json
import sys

from _ocr_common import LazyModel, make_layout_detector, make_ocr, make_table_pipeline, ocr_document_pages


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: ocr_document.py <path> [--pages 0,2,5]", file=sys.stderr)
        return 2

    input_path = sys.argv[1]
    pages = None
    if "--pages" in sys.argv:
        idx = sys.argv.index("--pages")
        pages = [int(p) for p in sys.argv[idx + 1].split(",") if p.strip() != ""]

    ocr = make_ocr()
    layout_detector = make_layout_detector()
    table_pipeline = LazyModel(make_table_pipeline)

    try:
        results = ocr_document_pages(ocr, layout_detector, table_pipeline, input_path, pages)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 2

    sys.stdout.buffer.write(json.dumps({"pages": results}).encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
