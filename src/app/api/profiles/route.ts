import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');

    const where: Record<string, unknown> = {};
    if (entityType) {
      where.entityType = entityType;
    }

    const profiles = await db.extractionProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('List profiles error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.entityType || !body.jsonSchema || !body.promptTemplate) {
      return NextResponse.json(
        { error: 'name, entityType, jsonSchema, and promptTemplate are required' },
        { status: 400 }
      );
    }

    const profile = await db.extractionProfile.create({
      data: {
        name: body.name,
        description: body.description || null,
        entityType: body.entityType,
        jsonSchema: body.jsonSchema,
        promptTemplate: body.promptTemplate,
        validationRules: body.validationRules ? JSON.stringify(body.validationRules) : null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Create profile error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create profile' },
      { status: 500 }
    );
  }
}
