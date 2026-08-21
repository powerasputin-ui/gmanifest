import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { llmVision } from '@/lib/llm/provider';
import { runOcr, summarizeOcrQuality } from '@/lib/paddle-ocr';
import type { DocumentParser, ParseResult } from './types';

const OCR_PROMPT =
  'Extract ALL text visible in this image. Return the text in a structured markdown format preserving the layout and hierarchy. Include all headings, paragraphs, tables, and lists. If this is a document (invoice, contract, receipt, etc.), preserve the document structure. If there is no text, return "No text found."';

export class ImageParser implements DocumentParser {
  canParse(fileType: string): boolean {
    return ['png', 'jpg', 'jpeg', 'image/png', 'image/jpeg', 'image/jpg'].includes(fileType);
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    // Real OCR (PaddleOCR) first — works regardless of whether the configured
    // LLM has vision support. Falls back to LLM vision if unavailable.
    const ocrResult = await this.tryPaddleOcr(buffer, fileName);
    if (ocrResult) return ocrResult;

    try {
      const mimeType = this.getMimeType(fileName);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const completion = await llmVision(OCR_PROMPT, dataUrl);

      const markdown = completion.content;
      const text = markdown.replace(/[#*|\-]/g, '').replace(/\s+/g, ' ').trim();

      const metadata: Record<string, unknown> = {
        mimeType,
        fileSize: buffer.length,
        ocrModel: 'vision-language-model',
      };

      return {
        markdown,
        text,
        metadata,
        pageCount: 1,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse image "${fileName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async tryPaddleOcr(buffer: Buffer, fileName: string): Promise<ParseResult | null> {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
    const tmpPath = path.join(os.tmpdir(), `ocr-img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
    await fs.promises.writeFile(tmpPath, buffer);
    try {
      const pages = await runOcr(tmpPath);
      const markdown = pages?.[0]?.text?.trim();
      if (!markdown) return null;

      return {
        markdown,
        text: markdown.replace(/\s+/g, ' ').trim(),
        metadata: {
          mimeType: this.getMimeType(fileName),
          fileSize: buffer.length,
          ocrModel: 'paddleocr',
          engine: 'paddleocr',
          ocrQuality: summarizeOcrQuality(pages ?? []),
        },
        pageCount: 1,
      };
    } finally {
      await fs.promises.unlink(tmpPath).catch(() => {});
    }
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };
    return mimeMap[ext] || 'image/png';
  }
}
