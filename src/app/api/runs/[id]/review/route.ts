import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface CorrectionField {
  fieldName: string;
  correctedValue: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fields } = body as { fields: CorrectionField[] };

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ error: 'fields array is required' }, { status: 400 });
    }

    // Verify run exists
    const run = await db.extractionRun.findUnique({
      where: { id },
      include: { fields: true },
    });

    if (!run) {
      return NextResponse.json({ error: 'Extraction run not found' }, { status: 404 });
    }

    // Process each correction
    for (const field of fields) {
      const existingField = run.fields.find((f) => f.fieldName === field.fieldName);

      // Create correction record
      await db.correction.create({
        data: {
          runId: id,
          fieldName: field.fieldName,
          originalValue: existingField?.value || null,
          correctedValue: field.correctedValue,
          originalMarkdown: run.rawLlmResponse || null,
          correctedBy: 'user',
        },
      });

      // Update the extracted field
      if (existingField) {
        await db.extractedField.update({
          where: { id: existingField.id },
          data: {
            value: field.correctedValue,
            isValid: true,
            validationError: null,
          },
        });
      }
    }

    // Rebuild the processed result JSON from updated fields
    const updatedFields = await db.extractedField.findMany({
      where: { runId: id },
    });

    const resultObj: Record<string, unknown> = {};
    for (const f of updatedFields) {
      if (f.value === null) {
        resultObj[f.fieldName] = null;
      } else {
        try {
          resultObj[f.fieldName] = JSON.parse(f.value);
        } catch {
          resultObj[f.fieldName] = f.value;
        }
      }
    }

    // Check if all fields are now valid
    const allValid = updatedFields.every((f) => f.isValid === true);

    // Update run
    const updatedRun = await db.extractionRun.update({
      where: { id },
      data: {
        status: allValid ? 'completed' : 'review',
        processedResult: JSON.stringify(resultObj),
      },
      include: {
        fields: true,
        corrections: true,
        document: true,
        profile: true,
      },
    });

    // If all valid, update document status too
    if (allValid) {
      await db.document.update({
        where: { id: run.documentId },
        data: { status: 'completed' },
      });
    }

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Review failed' },
      { status: 500 }
    );
  }
}
