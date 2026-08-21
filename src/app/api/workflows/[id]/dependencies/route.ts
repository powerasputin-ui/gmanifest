import { NextRequest, NextResponse } from 'next/server';
import { checkWorkflowDependencies } from '@/lib/dependency-checker';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const report = await checkWorkflowDependencies(id);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check dependencies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
