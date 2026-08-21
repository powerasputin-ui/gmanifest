import ExcelJS from 'exceljs';
import * as path from 'path';

/**
 * Fills the fixed СГТ (Cargo Summary Ticket) Excel template with extracted data.
 * Cell addresses below were mapped directly from templates/sgt-template.xlsx
 * (sheet "СГТ", rows 2-5 = order/logistics header, rows 6-13 = cargo table
 * with header in rows 6-7 and up to 6 data rows in rows 8-13).
 */

const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'sgt-template.xlsx');

export interface SgtHeader {
  supplierName?: string | null;
  supplierAddress?: string | null;
  destination?: string | null;
  consignee?: string | null;
  cargoDescription?: string | null;
  orderNumber?: string | null;
  dateOfOrder?: string | null;
}

export interface SgtCargoItem {
  qty?: string | null;
  unit?: string | null;
  lengthMm?: string | null;
  widthMm?: string | null;
  heightMm?: string | null;
  description?: string | null;
  weightKg?: string | null;
  unitIdNo?: string | null;
  vendorOwner?: string | null;
  technicalDescription?: string | null;
  sn?: string | null;
  pn?: string | null;
  hazardClass?: string | null;
  documentNumber?: string | null;
  cargoType?: string | null;
}

export interface SgtData {
  header?: SgtHeader | null;
  cargoItems?: SgtCargoItem[] | null;
}

const CARGO_TABLE_FIRST_ROW = 8;
const CARGO_TABLE_MAX_ROWS = 6;

export async function fillSgtTemplate(data: SgtData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const sheet = workbook.worksheets[0];

  const setIfPresent = (cellRef: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === '') return;
    sheet.getCell(cellRef).value = value;
  };

  // Numeric fields (qty, weight, dimensions) — write as a real number when the
  // value parses cleanly, so Excel treats it as a number (right-aligned,
  // summable) instead of text. Falls back to the raw string otherwise (e.g.
  // if the LLM included units despite instructions not to).
  const setNumericIfPresent = (cellRef: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === '') return;
    const normalized = value.trim().replace(',', '.');
    const num = Number(normalized);
    sheet.getCell(cellRef).value = Number.isFinite(num) && normalized !== '' ? num : value;
  };

  const header = data.header || {};
  setIfPresent('A3', header.supplierName);
  setIfPresent('G3', header.supplierAddress);
  setIfPresent('J3', header.cargoDescription);
  setIfPresent('R3', header.dateOfOrder);
  setIfPresent('S3', header.orderNumber);
  setIfPresent('A5', header.consignee);
  setIfPresent('G5', header.destination);

  const items = (data.cargoItems || []).slice(0, CARGO_TABLE_MAX_ROWS);
  items.forEach((item, index) => {
    const row = CARGO_TABLE_FIRST_ROW + index;
    sheet.getCell(`A${row}`).value = index + 1;
    setNumericIfPresent(`B${row}`, item.qty);
    setIfPresent(`C${row}`, item.unit);
    setNumericIfPresent(`D${row}`, item.lengthMm);
    setNumericIfPresent(`E${row}`, item.widthMm);
    setNumericIfPresent(`F${row}`, item.heightMm);
    setIfPresent(`G${row}`, item.description);
    setNumericIfPresent(`H${row}`, item.weightKg);
    setIfPresent(`I${row}`, item.unitIdNo);
    setIfPresent(`J${row}`, item.vendorOwner);
    setIfPresent(`K${row}`, item.technicalDescription);
    setIfPresent(`L${row}`, item.sn);
    setIfPresent(`M${row}`, item.pn);
    setIfPresent(`N${row}`, item.hazardClass);
    setIfPresent(`P${row}`, item.documentNumber);
    setIfPresent(`R${row}`, item.cargoType);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
