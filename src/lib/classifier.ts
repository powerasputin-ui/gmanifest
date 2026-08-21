import { llmExtract } from './llm/provider';

const DOCUMENT_TYPES = [
  'Invoice',
  'Contract',
  'Passport',
  'Resume',
  'Medical Report',
  'Receipt',
  'Other',
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface ClassificationResult {
  documentType: string;
  confidence: number;
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are a document classification expert. Given the text content of a document, classify it into exactly one of the following categories:

- Invoice: Счет на оплату, invoice, bill, commercial invoice
- Contract: Договор, contract, agreement, соглашение
- Passport: Паспорт, passport, travel document, identity document
- Resume: Резюме, resume, CV, curriculum vitae
- Medical Report: Медицинская справка, medical report, medical record, health document
- Receipt: Квитанция, receipt, чек
- Other: Any document that does not fit the above categories

You MUST respond with ONLY a JSON object in this exact format, no other text:
{"document_type": "<type>", "confidence": <number between 0 and 1>}

Where <type> is one of: Invoice, Contract, Passport, Resume, Medical Report, Receipt, Other
And <confidence> is your confidence level as a float between 0 and 1.`;

export async function classifyDocument(markdown: string): Promise<ClassificationResult> {
  try {
    // Truncate to avoid token limits (first ~4000 chars is usually enough)
    const truncatedMarkdown = markdown.slice(0, 4000);

    const userMessage = `Classify this document:

---
${truncatedMarkdown}
---

Respond with ONLY the JSON object.`;

    const { content } = await llmExtract(CLASSIFICATION_SYSTEM_PROMPT, userMessage);

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return { documentType: 'Other', confidence: 0.0 };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      document_type?: string;
      documentType?: string;
      confidence?: number;
    };

    const documentType = parsed.document_type || parsed.documentType || 'Other';
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;

    // Validate type is in allowed list
    const validTypes: string[] = [...DOCUMENT_TYPES];
    const normalizedType = validTypes.find(
      (t) => t.toLowerCase() === documentType.toLowerCase()
    ) || 'Other';

    return {
      documentType: normalizedType,
      confidence: Math.min(1, Math.max(0, confidence)),
    };
  } catch (error) {
    console.error('Classification error:', error);
    return { documentType: 'Other', confidence: 0.0 };
  }
}
