"""Thin CLI wrapper around pdf2docx for layout-preserving PDF -> DOCX conversion.

Usage: python pdf_to_docx.py <input.pdf> <output.docx>
Prints OK on success. On failure, prints the traceback to stderr and exits non-zero.
"""
import sys


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: pdf_to_docx.py <input.pdf> <output.docx>", file=sys.stderr)
        return 2

    input_path, output_path = sys.argv[1], sys.argv[2]

    from pdf2docx import Converter

    cv = Converter(input_path)
    try:
        cv.convert(output_path)
    finally:
        cv.close()

    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
