import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createWorkflow, createWorkflowFromTemplate, startWorkflow } from '@/lib/workflow-engine';

export async function GET(_request: NextRequest) {
  try {
    const workflows = await db.workflow.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        template: { select: { id: true, name: true, category: true, color: true } },
        project: { select: { id: true, name: true, status: true } },
        _count: { select: { steps: true } },
      },
    });

    return NextResponse.json({ data: workflows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list workflows';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, projectId, name } = body;

    // If templateId provided, create from template
    if (templateId) {
      const workflow = await createWorkflowFromTemplate(templateId, projectId, name);

      // If projectId also provided, start immediately
      if (projectId) {
        await startWorkflow(workflow.id, projectId);
        const started = await db.workflow.findUnique({
          where: { id: workflow.id },
          include: { steps: { orderBy: { stepOrder: 'asc' } }, template: true },
        });
        return NextResponse.json(started, { status: 201 });
      }

      return NextResponse.json(workflow, { status: 201 });
    }

    // Manual creation
    const { description, steps } = body;
    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'name and steps (non-empty array) are required' },
        { status: 400 }
      );
    }

    const workflow = await createWorkflow({
      name,
      description,
      steps,
      projectId: projectId || undefined,
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
