/**
 * JSON schema + prompt template for extracting data from a technical
 * specification document into the fixed «Суммарный грузовой талон» (СГТ)
 * Excel template (templates/sgt-template.xlsx).
 *
 * The template has two independent sections:
 *  - Order/logistics header (supplier, consignee, destination, dates...) —
 *    this information is almost never present in an equipment/vessel spec
 *    sheet, so it's extracted only if actually found; otherwise left blank
 *    for manual completion.
 *  - A cargo/unit table (up to 6 rows) describing the equipment/cargo item(s)
 *    the source document is about — this is what a spec PDF actually contains.
 */

export const SGT_JSON_SCHEMA = `{
  "header": {
    "supplierName": "string | null",
    "supplierAddress": "string | null",
    "destination": "string | null",
    "consignee": "string | null",
    "cargoDescription": "string | null",
    "orderNumber": "string | null",
    "dateOfOrder": "string | null"
  },
  "cargoItems": [
    {
      "qty": "string | null (quantity as a plain number, e.g. \\"1\\" — no units)",
      "unit": "string | null (e.g. \\"pcs\\", \\"unit\\")",
      "lengthMm": "string | null (length as a PLAIN NUMBER in millimeters, no unit suffix — convert if the source uses meters: multiply by 1000, e.g. source \\"78.56 m\\" -> \\"78560\\", NOT \\"785600\\")",
      "widthMm": "string | null (width/breadth as a PLAIN NUMBER in millimeters, same conversion rule as lengthMm)",
      "heightMm": "string | null (height/depth as a PLAIN NUMBER in millimeters, same conversion rule as lengthMm)",
      "description": "string | null (short cargo/equipment description, e.g. vessel or unit name)",
      "weightKg": "string | null (weight as a PLAIN NUMBER in kilograms — convert tonnes to kg by multiplying by 1000; do NOT use gross/net tonnage, which is a volume measure, not a weight)",
      "unitIdNo": "string | null (unit/container/IMO/serial identification number)",
      "vendorOwner": "string | null (vendor, owner, or manager name)",
      "technicalDescription": "string | null (key technical specifications summary, 1-3 sentences)",
      "sn": "string | null (serial number, if distinct from unitIdNo)",
      "pn": "string | null (part number, if applicable)",
      "hazardClass": "string | null (dangerous goods hazard class, if applicable)",
      "documentNumber": "string | null (related document/certificate number)",
      "cargoType": "string | null (type/category of cargo)"
    }
  ]
}`;

export type SgtLanguage = 'ru' | 'en';

const LANGUAGE_INSTRUCTIONS: Record<SgtLanguage, string> = {
  ru: `- Write every text value (descriptions, vendor/owner names' role wording, technical description, cargo type, hazard class) in RUSSIAN, using correct maritime/technical/logistics terminology (e.g. "Класс опасности", "Палубный груз", "Водоизмещение") — do not just transliterate or leave English text as-is. Translate; don't copy verbatim.
- Keep proper nouns as-is: vessel/equipment names, company names, model numbers, IMO/serial/document numbers, and units of measurement symbols must NOT be translated.
- If the source text is already in Russian, keep it in correct professional Russian (fix obvious OCR noise only, don't re-translate).`,
  en: `- Write every text value (descriptions, technical description, cargo type, hazard class) in ENGLISH, using correct maritime/technical/logistics terminology — translate rather than transliterate if the source is in another language.
- Keep proper nouns as-is: vessel/equipment names, company names, model numbers, IMO/serial/document numbers, and units of measurement symbols must NOT be translated.
- If the source text is already in English, keep it as-is (fix obvious OCR noise only, don't re-translate).`,
};

export function buildSgtPrompt(language: SgtLanguage = 'ru'): string {
  return `You are a precise data extraction assistant preparing data for a "Cargo Summary Ticket" (CST) form.

The source document is typically a technical specification sheet for a vessel, container, or piece of cargo/mobilization equipment.

Rules:
- Return ONLY valid JSON matching the schema exactly.
- "header" fields are order/shipment logistics details (supplier, consignee, destination, order number/date). These are RARELY present in a technical spec sheet — set to null unless explicitly stated in the document. Do not guess or infer them from unrelated data.
- "cargoItems" describes the physical unit(s)/equipment the document is about (usually just one item: the vessel/unit itself). Fill in whatever technical fields are explicitly present in the document (dimensions, weight, identification numbers, vendor/manager, technical summary). Set any field to null if not found.
- Numeric fields (qty, lengthMm, widthMm, heightMm, weightKg) must be a PLAIN NUMBER as a string, with no unit text and no thousands separators (e.g. "78560", not "78.56 m" or "78,560 mm"). Double-check unit conversions carefully (m -> mm is x1000, tonnes -> kg is x1000) — do not shift the decimal point by the wrong amount.
${LANGUAGE_INSTRUCTIONS[language]}
- Do NOT invent or hallucinate values.
- Do NOT include any explanation or commentary outside the JSON.
- If nothing qualifies as a cargo item, return an empty array for "cargoItems".`;
}
