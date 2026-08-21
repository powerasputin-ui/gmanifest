import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const settings = await db.settings.findMany({
      orderBy: { category: 'asc' },
    });

    // Group by category
    const grouped: Record<string, Array<{ id: string; key: string; value: string; description: string | null }>> = {};
    for (const s of settings) {
      if (!grouped[s.category]) {
        grouped[s.category] = [];
      }
      grouped[s.category].push({
        id: s.id,
        key: s.key,
        value: s.value,
        description: s.description,
      });
    }

    return NextResponse.json({ settings, grouped });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const items: Array<{ key: string; value: string; category?: string; description?: string }> = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Expected an array of { key, value }' }, { status: 400 });
    }

    const updated: Array<{ id: string; createdAt: Date; updatedAt: Date; description: string | null; value: string; key: string; category: string }> = [];

    for (const item of items) {
      if (!item.key) continue;

      const setting = await db.settings.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: {
          key: item.key,
          value: item.value,
          category: item.category || 'general',
          description: item.description || null,
        },
      });
      updated.push(setting);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}
