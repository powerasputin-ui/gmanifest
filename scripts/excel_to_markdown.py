"""Thin CLI wrapper around excel-parser: converts an .xlsx into markdown text
so it can flow through the same pipeline as PDF/DOCX documents (Document.markdown).

Usage: python excel_to_markdown.py <input.xlsx>
Prints markdown to stdout. On failure, prints the traceback to stderr and exits non-zero.
"""
import sys


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: excel_to_markdown.py <input.xlsx>", file=sys.stderr)
        return 2

    input_path = sys.argv[1]

    from excel_parser import parse_workbook

    result = parse_workbook(path=input_path)

    parts = []
    current_sheet = None
    for chunk in result.chunks:
        if chunk.sheet_name != current_sheet:
            current_sheet = chunk.sheet_name
            parts.append(f"## {current_sheet}")
        parts.append(f"### {chunk.cell_range}")
        parts.append(chunk.render_text)

    sys.stdout.buffer.write("\n\n".join(parts).encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
