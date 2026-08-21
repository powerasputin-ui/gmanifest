import * as path from 'path';
import type { DocumentParser, ParseResult } from './types';
import { runPythonScript } from '../python-bridge';
import * as fs from 'fs';
import * as os from 'os';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'excel_to_markdown.py');
const PARSE_TIMEOUT_MS = 60_000;

/**
 * Parses .xlsx/.xls source documents into markdown using the local
 * `excel-parser` Python library (structure-aware: tables, merged cells,
 * formulas). Requires the package from requirements.txt to be installed —
 * see scripts/excel_to_markdown.py.
 *
 * Unlike the OCR/layout-fidelity Python integrations elsewhere in this
 * project, there is no in-process fallback for reading Excel — if the
 * parser is unavailable, upload fails with a clear error instead of
 * silently producing an empty document.
 */
export class ExcelSourceParser implements DocumentParser {
  canParse(fileType: string): boolean {
    return ['xlsx', 'xls'].includes(fileType.toLowerCase());
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const tmpIn = path.join(os.tmpdir(), `excel-src-${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`);
    await fs.promises.writeFile(tmpIn, buffer);

    try {
      const result = await runPythonScript(SCRIPT_PATH, [tmpIn], { timeoutMs: PARSE_TIMEOUT_MS });
      if (!result) {
        throw new Error(
          'Не удалось разобрать Excel-файл: локальный парсер (excel-parser) недоступен. ' +
            'Установите зависимости: pip install -r requirements.txt'
        );
      }

      const markdown = result.stdout.trim();
      if (!markdown) {
        throw new Error('Excel-файл не содержит данных для распознавания.');
      }

      const text = markdown.replace(/[#*|\-]/g, ' ').replace(/\s+/g, ' ').trim();

      return {
        markdown,
        text,
        metadata: { engine: 'excel-parser' },
      };
    } finally {
      await fs.promises.unlink(tmpIn).catch(() => {});
    }
  }
}
