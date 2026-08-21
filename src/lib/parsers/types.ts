export interface ParseResult {
  markdown: string;
  text: string;
  metadata: Record<string, unknown>;
  pageCount?: number;
  images?: Array<{ page: number; data: string; mimeType: string }>;
}

export interface DocumentParser {
  canParse(fileType: string): boolean;
  parse(buffer: Buffer, fileName: string): Promise<ParseResult>;
}
