import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkflowStatus } from '@/lib/workflow-engine';
import { checkWorkflowDependencies } from '@/lib/dependency-checker';
import type { DependencyReport } from '@/lib/dependency-checker';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const workflow = await getWorkflowStatus(id);
  if (!workflow) {
    return NextResponse.json({ error: 'Процесс не найден' }, { status: 404 });
  }

  // Get dependency report for current step if in_progress
  let dependencyReport: DependencyReport | null = null;
  if (workflow.status === 'in_progress' && workflow.currentStep > 0) {
    try {
      dependencyReport = await checkWorkflowDependencies(id);
    } catch {
      // Dependency check may fail if no project — that's fine
    }
  }

  return NextResponse.json({ workflow, dependencyReport });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Процесс не найден' }, { status: 404 });
    }

    const workflow = await db.workflow.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        projectId: body.projectId !== undefined ? body.projectId : existing.projectId,
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } }, template: true },
    });

    return NextResponse.json(workflow);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const workflow = await db.workflow.findUnique({ where: { id } });
  if (!workflow) {
    return NextResponse.json({ error: 'Процесс не найден' }, { status: 404 });
  }

  try {
    await db.workflow.delete({ where: { id } });
    return NextResponse.json({ message: 'Процесс удалён' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
