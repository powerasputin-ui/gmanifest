import { NextResponse } from 'next/server';
import { ENTITY_TYPES, ENTITY_FIELDS, EntityType, EntityFieldDef } from '@/lib/unified-model';

export type { EntityType, EntityFieldDef };

export async function GET() {
  return NextResponse.json({
    entityTypes: ENTITY_TYPES,
    entityFields: ENTITY_FIELDS,
  });
}
