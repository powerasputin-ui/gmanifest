import { NextRequest, NextResponse } from 'next/server';
import { computeWorkflowCompleteness, checkDataCompleteness } from '@/lib/dependency-checker';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Процесс не найден' }, { status: 404 });
    }

    // Compute and save completeness
    const percent = await computeWorkflowCompleteness(id);

    // Get breakdown
    let breakdown: Array<{
      entity: string;
      required: boolean;
      found: boolean;
      completeness: number;
      missingFields: string[];
      sources: string[];
    }> = [];
    const requiredEntities = workflow.template?.requiredEntityTypes
      ? JSON.parse(workflow.template.requiredEntityTypes) as string[]
      : [];

    if (workflow.projectId && requiredEntities.length > 0) {
      breakdown = await checkDataCompleteness(workflow.projectId, requiredEntities);
    }

    return NextResponse.json({
      workflowId: id,
      completenessPercent: percent,
      breakdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get completeness';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
