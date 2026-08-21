import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { llmExtract } from '@/lib/llm/provider';
import { SGT_JSON_SCHEMA, buildSgtPrompt, type SgtLanguage } from '@/lib/sgt-schema';
import { fillSgtTemplate, type SgtData } from '@/lib/excel-template-engine';
import { buildExtractionPrompt } from '@/lib/prompt-engine';
import { verifySgtData } from '@/lib/sgt-verify';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const document = await db.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  if (!document.markdown) {
    return NextResponse.json({ error: 'Document has no extracted text' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const language: SgtLanguage = body.language === 'en' ? 'en' : 'ru';

  try {
    const { systemPrompt, userMessage } = buildExtractionPrompt(
      document.markdown,
      SGT_JSON_SCHEMA,
      buildSgtPrompt(language)
    );

    const { content } = await llmExtract(systemPrompt, userMessage);

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const jsonStr = (jsonMatch[1] || content).trim();

    let extracted: SgtData;
    try {
      extracted = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: 'LLM did not return valid JSON', raw: content.slice(0, 500) },
        { status: 502 }
      );
    }

    const warnings = verifySgtData(extracted);

    const buffer = await fillSgtTemplate(extracted);
    const baseName = document.fileName.replace(/\.[^.]+$/, '');
    const fileName = `СГТ_${baseName}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString(),
        'X-SGT-Warning-Count': String(warnings.length),
        'X-SGT-Warnings': encodeURIComponent(JSON.stringify(warnings)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate СГТ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
