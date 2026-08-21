import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fillTemplate } from '@/lib/template-engine';
import { mapToTemplateValues } from '@/lib/unified-model';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { UPLOADS_DIR } from '@/lib/paths';

const GENERATE_DIR = path.join(UPLOADS_DIR, 'generated');

// Ensure directory exists
if (!fs.existsSync(GENERATE_DIR)) {
  fs.mkdirSync(GENERATE_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, templateId } = body;

    if (!projectId || !templateId) {
      return NextResponse.json(
        { error: 'projectId and templateId are required' },
        { status: 400 }
      );
    }

    // Validate project and template exist
    const [project, template] = await Promise.all([
      db.project.findUnique({ where: { id: projectId } }),
      db.documentTemplate.findUnique({ where: { id: templateId } }),
    ]);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create generation record
    const generation = await db.documentGeneration.create({
      data: {
        projectId,
        templateId,
        status: 'generating',
        generatedBy: 'system',
      },
    });

    try {
      // 1. Get mappings for template
      const mappings = await db.templateMapping.findMany({
        where: { templateId },
      });

      if (mappings.length === 0) {
        await db.documentGeneration.update({
          where: { id: generation.id },
          data: {
            status: 'error',
            errors: JSON.stringify(['No mappings configured for template']),
          },
        });
        return NextResponse.json({ error: 'No mappings configured' }, { status: 400 });
      }

      // 2. Resolve values from project model
      const values = await mapToTemplateValues(projectId, mappings);
      const errors: string[] = [];

      // Check for unfilled values
      for (const mapping of mappings) {
        const varName = mapping.templateVariable.replace(/\{\{|\}\}/g, '').trim();
        if (!values[varName]) {
          errors.push(`Unfilled variable: ${mapping.templateVariable}`);
        }
      }

      // 3. Fill template
      const outputBuffer = await fillTemplate(template.filePath, values);

      // 4. Save output file
      const outputFileName = `${template.fileName.replace('.docx', '')}_${project.name}_${new Date().toISOString().slice(0, 10)}.docx`;
      const outputFilePath = path.join(GENERATE_DIR, `${generation.id}.docx`);
      await fs.promises.writeFile(outputFilePath, outputBuffer);

      // 5. Track source documents
      const projectDocs = await db.projectDocument.findMany({
        where: { projectId },
        include: { document: true },
      });

      for (const pd of projectDocs) {
        await db.generationSource.create({
          data: {
            generationId: generation.id,
            documentId: pd.documentId,
            documentFileName: pd.document.fileName,
          },
        });
      }

      // 6. Update generation record
      const updatedGeneration = await db.documentGeneration.update({
        where: { id: generation.id },
        data: {
          status: errors.length > 0 ? 'completed_with_warnings' : 'completed',
          outputFilePath,
          outputFileName,
          valuesUsed: JSON.stringify(values),
          errors: errors.length > 0 ? JSON.stringify(errors) : null,
        },
      });

      return NextResponse.json({
        data: updatedGeneration,
        downloadUrl: `/api/generate/${generation.id}/download`,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      // Update generation record with error
      await db.documentGeneration.update({
        where: { id: generation.id },
        data: {
          status: 'error',
          errors: JSON.stringify([error instanceof Error ? error.message : String(error)]),
        },
      });

      const message = error instanceof Error ? error.message : 'Failed to generate document';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
