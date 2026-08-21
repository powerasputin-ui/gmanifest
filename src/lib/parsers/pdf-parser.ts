import { GlobalWorkerOptions } from 'pdfjs-dist';
import { PDFParse } from 'pdf-parse';
import type { DocumentParser, ParseResult } from './types';

// Disable pdfjs-dist worker thread globally to avoid
// "Cannot transfer object of unsupported type" in Node.js.
GlobalWorkerOptions.workerSrc = '';

export class PdfParser implements DocumentParser {
  canParse(fileType: string): boolean {
    return fileType === 'pdf' || fileType === 'application/pdf';
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    let parser: PDFParse | null = null;
    try {
      // pdfjs-dist in Node.js uses a worker thread by default. Transferring
      // the PDF data to the worker via postMessage can fail with:
      //   "Cannot transfer object of unsupported type"
      // Disabling the worker forces pdfjs to parse the PDF on the main thread,
      // avoiding the postMessage transfer entirely.
      const ab = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(ab).set(buffer);
      // disableWorker is a valid pdfjs-dist option but not in pdf-parse's
      // LoadParameters type — cast to satisfy TypeScript.
      parser = new PDFParse({
        data: new Uint8Array(ab),
        disableWorker: true,
      } as ConstructorParameters<typeof PDFParse>[0]);

      const [textResult, infoResult] = await Promise.all([
        parser.getText(),
        parser.getInfo(),
      ]);

      const text: string = textResult.text || '';
      const markdown = this.textToMarkdown(text);
      const pageCount = textResult.total || 1;

      const info = (infoResult.info as Record<string, unknown>) || {};

      const metadata: Record<string, unknown> = {
        title: info.Title || null,
        author: info.Author || null,
        subject: info.Subject || null,
        creator: info.Creator || null,
        producer: info.Producer || null,
        creationDate: info.CreationDate || null,
        modDate: info.ModDate || null,
        pageCount,
      };

      return {
        markdown,
        text,
        metadata,
        pageCount,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse PDF "${fileName}": ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (parser) {
        await parser.destroy().catch(() => {});
      }
    }
  }

  private textToMarkdown(text: string): string {
    if (!text || text.trim().length === 0) return '';

    // Split into lines and clean up
    const lines = text.split('\n');
    const result: string[] = [];
    let inParagraph = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.length === 0) {
        if (inParagraph) {
          result.push('');
          inParagraph = false;
        }
        continue;
      }

      // Heuristic: lines that are very short and ALL CAPS might be headings
      if (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-ZА-ЯЁ]/.test(trimmed)) {
        result.push('');
        result.push(`## ${trimmed}`);
        result.push('');
        inParagraph = false;
      } else {
        result.push(trimmed);
        inParagraph = true;
      }
    }

    return result.join('\n').trim();
  }
}