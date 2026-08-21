import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const templates = await db.workflowTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { workflows: true, rules: true } } },
    });
    return NextResponse.json({ data: templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, icon, color, requiredEntityTypes, requiredDocumentTypes, outputTemplates, defaultSteps } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'name and category are required' }, { status: 400 });
    }

    const template = await db.workflowTemplate.create({
      data: {
        name,
        description: description || null,
        category,
        icon: icon || null,
        color: color || null,
        requiredEntityTypes: requiredEntityTypes ? JSON.stringify(requiredEntityTypes) : null,
        requiredDocumentTypes: requiredDocumentTypes ? JSON.stringify(requiredDocumentTypes) : null,
        outputTemplates: outputTemplates ? JSON.stringify(outputTemplates) : null,
        defaultSteps: defaultSteps ? JSON.stringify(defaultSteps) : null,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
