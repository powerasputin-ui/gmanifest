import { db } from '@/lib/db';
import { llmExtract, getActiveModelName } from '@/lib/llm/provider';
import { buildExtractionPrompt } from '@/lib/prompt-engine';
import { validateFields } from '@/lib/validator';

export async function processDocument(
  documentId: string,
  profileId: string
): Promise<Record<string, unknown>> {
  // 1. Get document from DB
  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }
  if (!document.markdown) {
    throw new Error(`Document ${documentId} has no extracted markdown content`);
  }

  // 2. Get profile from DB
  const profile = await db.extractionProfile.findUnique({ where: { id: profileId } });
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // 3. Create ExtractionRun record
  const run = await db.extractionRun.create({
    data: {
      documentId,
      profileId,
      status: 'processing',
      modelUsed: await getActiveModelName(),
    },
  });

  const startTime = Date.now();

  try {
    // 4. Build prompt
    const { systemPrompt, userMessage } = buildExtractionPrompt(
      document.markdown,
      profile.jsonSchema,
      profile.promptTemplate
    );

    // 5. Call LLM
    const { content, tokensUsed } = await llmExtract(systemPrompt, userMessage);

    // 6. Parse JSON response
    let extractedData: Record<string, unknown>;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = (jsonMatch[1] || content).trim();
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      await db.extractionRun.update({
        where: { id: run.id },
        data: {
          status: 'error',
          errorMessage: `Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          rawLlmResponse: content,
          processingTime: Date.now() - startTime,
          tokensUsed,
        },
      });
      await db.document.update({
        where: { id: documentId },
        data: { status: 'error' },
      });
      throw new Error('LLM response is not valid JSON');
    }

    const processingTime = Date.now() - startTime;

    // 7. Validate extracted fields
    const validation = validateFields(extractedData, profile.validationRules);

    // 8. Save ExtractedField records
    const fieldsToCreate: Array<{
      runId: string;
      fieldName: string;
      value: string | null;
      confidence: number | null;
      isValid: boolean | null;
      validationError: string | null;
    }> = [];

    for (const [key, value] of Object.entries(extractedData)) {
      const fieldValidation = validation.fieldResults[key];
      const isNull = value === null || value === undefined;
      const stringValue = isNull ? null : (typeof value === 'object' ? JSON.stringify(value) : String(value));

      fieldsToCreate.push({
        runId: run.id,
        fieldName: key,
        value: stringValue,
        confidence: isNull ? null : 0.95,
        isValid: fieldValidation?.isValid ?? true,
        validationError: fieldValidation?.error || null,
      });
    }

    await db.extractedField.createMany({ data: fieldsToCreate });

    // 9-10. Determine run status
    const runStatus = validation.isValid ? 'completed' : 'review';
    const processedResult = JSON.stringify(extractedData);

    // 11. Update run and document
    const updatedRun = await db.extractionRun.update({
      where: { id: run.id },
      data: {
        status: runStatus,
        rawLlmResponse: content,
        processedResult,
        processingTime,
        tokensUsed,
      },
    });

    const docStatus = runStatus === 'completed' ? 'completed' : 'review';
    await db.document.update({
      where: { id: documentId },
      data: { status: docStatus },
    });

    // 12. Return the run with fields
    const runWithFields = await db.extractionRun.findUnique({
      where: { id: updatedRun.id },
      include: {
        fields: true,
        corrections: true,
        document: true,
        profile: true,
      },
    });

    return runWithFields as unknown as Record<string, unknown>;
  } catch (error) {
    // If not already handled above (JSON parse error)
    const existingRun = await db.extractionRun.findUnique({ where: { id: run.id } });
    if (existingRun?.status === 'processing') {
      await db.extractionRun.update({
        where: { id: run.id },
        data: {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : String(error),
          processingTime: Date.now() - startTime,
        },
      });
      await db.document.update({
        where: { id: documentId },
        data: { status: 'error' },
      });
    }
    throw error;
  }
}
