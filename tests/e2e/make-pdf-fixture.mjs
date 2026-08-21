import fs from 'fs';
// Minimal one-page text PDF
const content = `BT /F1 24 Tf 72 720 Td (INVOICE) Tj ET
BT /F1 12 Tf 72 690 Td (Seller: OOO Romashka INN 7707083893) Tj ET
BT /F1 12 Tf 72 670 Td (Buyer: OOO Vega INN 7701234567) Tj ET
BT /F1 12 Tf 72 650 Td (Invoice number: 42 Date: 01.02.2026) Tj ET
BT /F1 12 Tf 72 630 Td (Total amount: 12000.00 RUB) Tj ET`;
const objects = [];
objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>';
objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
objects[5] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
let pdf = '%PDF-1.4\n';
const offsets = [0];
for (let i = 1; i <= 5; i++) {
  offsets[i] = pdf.length;
  pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
}
const xrefPos = pdf.length;
pdf += `xref\n0 6\n0000000000 65535 f \n`;
for (let i = 1; i <= 5; i++) pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
fs.writeFileSync('tests/e2e/fixtures/invoice-test.pdf', pdf);
console.log('PDF written', pdf.length, 'bytes');
