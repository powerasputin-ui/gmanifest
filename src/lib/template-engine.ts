import JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DOCX Template Engine — fills DOCX templates with variable values.
 * Uses JSZip to unzip, find/replace in XML, and rezip.
 */

/**
 * Normalizes split {{...}} patterns in DOCX XML.
 * Word sometimes splits text runs across multiple <w:r> elements,
 * so {{variable}} might become {{varia}} + {{ble}} across two <w:t> elements.
 * This function reunites such splits by removing XML tags between curly braces.
 */
function normalizeXmlPlaceholders(xml: string): string {
  // Match partial {{ patterns that are split by XML elements
  // Strategy: find all text between {{ and }} that might have XML tags in between
  let result = xml;
  let changed = true;
  let iterations = 0;
  const maxIterations = 20; // safety limit

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Pattern: {{text}} with XML tags inside the braces
    // e.g. {{var<w:rPr>...</w:rPr></w:r><w:r><w:t>iable}}
    const regex = /\{\{([^}]*)\}\}/g;
    result = result.replace(regex, (match) => {
      // Remove all XML tags inside the {{ }} pair
      const cleaned = match.replace(/<[^>]+>/g, '');
      if (cleaned !== match) {
        changed = true;
      }
      return cleaned;
    });
  }

  // Second pass: handle cases where {{ and }} are split across text nodes
  // e.g. <w:t>{{var</w:t></w:r><w:r><w:t>iable}}</w:t>
  result = result.replace(/\{\{[^}]*$/gm, ''); // remove orphan {{
  result = result.replace(/^[^{]*\}\}/gm, ''); // remove orphan }}

  // Re-assemble: find cases where {{ and closing }} are in different <w:t> elements
  // Look for open {{ without closing }} in a single text run
  const openBraceRe = /\{\{([^}<>]*(?:<[^>]+>[^}<>]*)*)$/gm;
  let passChanged = true;
  let passIter = 0;
  while (passChanged && passIter < maxIterations) {
    passChanged = false;
    passIter++;
    result = result.replace(/(<w:t[^>]*>)\{\{([^}]*?)(<\/w:t>)([^<]*)(<w:t[^>]*>)([^<]*?)(\}\})(<\/w:t>)/g,
      (_match, p1, p2, p3, p4, p5, p6, p7, p8) => {
        passChanged = true;
        return `${p1}{{${p2}${p6}${p7}${p8}`;
      }
    );
  }

  return result;
}

/**
 * Extract all {{variable}} placeholders from a DOCX template.
 */
export async function extractVariables(templatePath: string): Promise<string[]> {
  const buffer = await fs.promises.readFile(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = zip.file('word/document.xml');
  if (!docXml) {
    throw new Error('Invalid DOCX: missing word/document.xml');
  }

  let xml = await docXml.async('string');
  xml = normalizeXmlPlaceholders(xml);

  const matches = xml.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];

  return [...new Set(matches.map((m) => m.slice(2, -2).trim()))];
}

/**
 * Fill a DOCX template with the given values.
 * Returns a Buffer of the filled DOCX file.
 */
export async function fillTemplate(
  templatePath: string,
  values: Record<string, string>
): Promise<Buffer> {
  const buffer = await fs.promises.readFile(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = zip.file('word/document.xml');
  if (!docXml) {
    throw new Error('Invalid DOCX: missing word/document.xml');
  }

  let xml = await docXml.async('string');

  // Normalize split placeholders first
  xml = normalizeXmlPlaceholders(xml);

  // Also process headers and footers
  const xmlFiles = [
    'word/document.xml',
    'word/header1.xml',
    'word/header2.xml',
    'word/footer1.xml',
    'word/footer2.xml',
  ];

  for (const fileName of xmlFiles) {
    const file = zip.file(fileName);
    if (!file) continue;

    let content = await file.async('string');
    content = normalizeXmlPlaceholders(content);

    // Replace each placeholder with its value
    for (const [key, value] of Object.entries(values)) {
      // Escape special regex characters in the key
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace both {{key}} patterns
      const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g');
      content = content.replace(regex, escapeXml(value));
    }

    // Clean up any unreplaced placeholders (replace with empty string)
    content = content.replace(/\{\{[^}]+\}\}/g, '');

    zip.file(fileName, content);
  }

  return await zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Escape special XML characters in replacement text.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate HTML preview of a filled template.
 */
export async function previewTemplate(
  templatePath: string,
  values: Record<string, string>
): Promise<string> {
  // Extract plain text content from DOCX for preview
  const buffer = await fs.promises.readFile(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = zip.file('word/document.xml');
  if (!docXml) {
    throw new Error('Invalid DOCX: missing word/document.xml');
  }

  let xml = await docXml.async('string');
  xml = normalizeXmlPlaceholders(xml);

  // Replace placeholders with values
  for (const [key, value] of Object.entries(values)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g');
    xml = xml.replace(regex, value);
  }
  // Clean up unreplaced placeholders
  xml = xml.replace(/\{\{[^}]+\}\}/g, '<span class="placeholder">___</span>');

  // Extract text from <w:t> elements and build HTML
  const paragraphs: string[] = [];
  const paragraphRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let paraMatch: RegExpExecArray | null;

  while ((paraMatch = paragraphRegex.exec(xml)) !== null) {
    const paraXml = paraMatch[0];
    const texts: string[] = [];
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let textMatch: RegExpExecArray | null;

    while ((textMatch = textRegex.exec(paraXml)) !== null) {
      texts.push(textMatch[1]);
    }

    if (texts.length > 0) {
      paragraphs.push(texts.join(''));
    } else {
      // Empty paragraph = line break
      paragraphs.push('');
    }
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 210mm; margin: 20mm auto; padding: 0 20px; line-height: 1.6; }
    p { margin: 0.5em 0; min-height: 1em; }
    .placeholder { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  ${paragraphs.map((p) => `<p>${p || '&nbsp;'}</p>`).join('\n')}
</body>
</html>`;
}
