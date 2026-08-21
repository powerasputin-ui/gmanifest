import { NextRequest, NextResponse } from 'next/server';
import { advanceWorkflow } from '@/lib/workflow-engine';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await advanceWorkflow(id);

    if (!result.canAdvance && result.missingRequirements.length > 0) {
      return NextResponse.json(
        {
          canAdvance: false,
          nextStep: null,
          missingRequirements: result.missingRequirements,
          dependencyReport: result.dependencyReport,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to advance workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
