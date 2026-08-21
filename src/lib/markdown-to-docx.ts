import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

/**
 * Converts a subset of markdown (as produced by the PDF/image parsers) into a
 * readable .docx buffer: headings, GFM tables, bold/italic text, plain paragraphs.
 */

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Split on **bold**, *italic* and <u>underline</u> (pdf-inspector sometimes emits raw HTML tags)
  // while keeping the delimiters for classification.
  const tokens = text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|<u>[^<]*<\/u>)/g)
    .filter((t) => t.length > 0);
  for (const token of tokens) {
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else if (token.startsWith('<u>') && token.endsWith('</u>')) {
      runs.push(new TextRun({ text: token.slice(3, -4), underline: {} }));
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
    } else {
      // Strip any remaining stray HTML tags, keeping their text content.
      runs.push(new TextRun(token.replace(/<[^>]+>/g, '')));
    }
  }
  return runs.length > 0 ? runs : [new TextRun('')];
}

function isTableSeparatorRow(line: string): boolean {
  // e.g. |---|:---:|---|
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function buildTable(rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (cells) =>
        new TableRow({
          children: cells.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph({ children: parseInline(cell) })],
              })
          ),
        })
    ),
  });
}

export function markdownToDocx(markdown: string): Promise<Buffer> {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      children.push(
        new Paragraph({
          heading: HEADING_LEVELS[level - 1],
          children: parseInline(headingMatch[2].trim()),
        })
      );
      i++;
      continue;
    }

    // GFM table: current line looks like a row and next line is a separator
    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1])) {
      const tableRows: string[][] = [parseTableRow(line)];
      i += 2; // skip header + separator
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableRows.push(parseTableRow(lines[i]));
        i++;
      }
      children.push(buildTable(tableRows));
      continue;
    }

    // Plain paragraph — merge consecutive non-blank, non-special lines
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,6}\s+/) &&
      !lines[i].trim().startsWith('|')
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    children.push(new Paragraph({ children: parseInline(paraLines.join(' ')) }));
  }

  if (children.length === 0) {
    children.push(new Paragraph(''));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
