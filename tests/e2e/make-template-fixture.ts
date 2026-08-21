// Generates a DOCX template fixture with {{placeholders}} for e2e tests.
// Run: bun tests/e2e/make-template-fixture.ts
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('tests/e2e/fixtures', { recursive: true });

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ', bold: true })],
        }),
        new Paragraph('Заказчик: {{company_name}}'),
        new Paragraph('ИНН: {{company_inn}}'),
        new Paragraph('Сумма: {{total_amount}} руб.'),
        new Paragraph('Дата: {{date}}'),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync('tests/e2e/fixtures/template-test.docx', buffer);
console.log('template-test.docx written:', buffer.length, 'bytes');
