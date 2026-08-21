import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.fileName = { contains: search };
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { extractionRuns: true } },
        },
      }),
      db.document.count({ where }),
    ]);

    // Document.projectId has no declared Prisma relation (schema constraint),
    // so resolve project names in a second lookup instead of `include`.
    const projectIds = [...new Set(documents.map((d) => d.projectId).filter((id): id is string => !!id))];
    const projects = projectIds.length
      ? await db.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
      : [];
    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
    const documentsWithProject = documents.map((d) => ({
      ...d,
      projectName: d.projectId ? projectNameById.get(d.projectId) || null : null,
    }));

    return NextResponse.json({
      data: documentsWithProject,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const document = await db.document.create({
      data: {
        fileName: body.fileName || 'untitled',
        fileType: body.fileType || 'unknown',
        fileSize: body.fileSize || 0,
        filePath: body.filePath || '',
        status: body.status || 'uploaded',
        markdown: body.markdown || null,
        pageCount: body.pageCount || null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
        classificationType: body.classificationType || null,
        classificationConfidence: body.classificationConfidence || null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create document' },
      { status: 500 }
    );
  }
}
