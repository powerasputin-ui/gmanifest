/**
 * Build the extraction prompt from markdown content and a profile's JSON Schema.
 */

const DEFAULT_PROMPT_TEMPLATE = `You are a precise data extraction assistant. Extract data from the provided document text according to the JSON schema.

Rules:
- Return ONLY valid JSON matching the schema exactly.
- If a field value is not found in the document, set it to null.
- Do NOT invent or hallucinate values.
- Do NOT include any explanation or commentary outside the JSON.
- For array fields, return an empty array [] if no items found.
- Preserve the original text/values exactly as they appear in the document.`;

export function buildExtractionPrompt(
  markdown: string,
  jsonSchema: string,
  promptTemplate?: string | null
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = promptTemplate
    ? `${promptTemplate}\n\nReturn ONLY valid JSON matching the schema. If a field is not found, return null for that field.`
    : DEFAULT_PROMPT_TEMPLATE;

  const userMessage = `Extract data from the following document.

JSON Schema:
${jsonSchema}

Document content:
---
${markdown.slice(0, 8000)}
---

Return ONLY the JSON object matching the schema.`;

  return { systemPrompt, userMessage };
}
