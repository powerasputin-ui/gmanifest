import type { DocumentParser } from './types';
import { PdfInspectorParser } from './pdf-inspector-parser';
import { DocxParser } from './docx-parser';
import { ImageParser } from './image-parser';
import { ExcelSourceParser } from './excel-source-parser';

// PdfInspectorParser handles PDFs (with internal pdf-parse fallback).
const parsers: DocumentParser[] = [
  new PdfInspectorParser(),
  new DocxParser(),
  new ImageParser(),
  new ExcelSourceParser(),
];

/**
 * Get a parser for the given file type.
 * Returns null if the file type is not supported.
 */
export function getParser(fileType: string): DocumentParser | null {
  const normalizedType = fileType.toLowerCase().trim();
  for (const parser of parsers) {
    if (parser.canParse(normalizedType)) {
      return parser;
    }
  }
  return null;
}
