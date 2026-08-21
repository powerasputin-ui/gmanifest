import mammoth from 'mammoth';
import type { DocumentParser, ParseResult } from './types';

export class DocxParser implements DocumentParser {
  canParse(fileType: string): boolean {
    return (
      fileType === 'docx' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    try {
      const textResult = await mammoth.extractRawText({ buffer });
      const htmlResult = await mammoth.convertToHtml({ buffer });

      const text: string = textResult.value || '';
      const html: string = htmlResult.value || '';

      const markdown = this.htmlToMarkdown(html);

      const metadata: Record<string, unknown> = {
        title: fileName.replace(/\.docx$/i, ''),
        messages: [...textResult.messages, ...htmlResult.messages],
      };

      return {
        markdown,
        text,
        metadata,
        pageCount: undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse DOCX "${fileName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private htmlToMarkdown(html: string): string {
    if (!html || html.trim().length === 0) return '';

    let md = html;

    // Convert headings
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '## $1\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
    md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
    md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');

    // Convert bold and italic
    md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');

    // Convert lists
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');

    // Convert paragraphs and breaks
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Convert tables (simple)
    md = md.replace(/<tr[^>]*>(.*?)<\/tr>/gi, (_, content) => {
      const cells = content
        .replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, '| $1 ')
        .replace(/<[^>]+>/g, '')
        .trim();
      return `${cells}|\n`;
    });
    md = md.replace(/<\/?(table|thead|tbody|th|td)[^>]*>/gi, '\n');

    // Remove any remaining HTML tags
    md = md.replace(/<[^>]+>/g, '');

    // Clean up whitespace
    md = md.replace(/\n{3,}/g, '\n\n');

    return md.trim();
  }
}
