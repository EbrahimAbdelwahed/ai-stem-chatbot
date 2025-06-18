import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Assuming db instance is exported from here
import { visualizations } from '@/lib/db/schema'; // Assuming schema is here
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const visualizationId = params.id;

    if (!visualizationId) {
      return NextResponse.json({ error: 'Visualization ID is required' }, { status: 400 });
    }

    const visualization = await db.query.visualizations.findFirst({
      where: eq(visualizations.id, visualizationId),
    });

    if (!visualization) {
      return NextResponse.json({ error: 'Visualization not found' }, { status: 404 });
    }

    return NextResponse.json(visualization);
  } catch (error) {
    console.error('Failed to fetch visualization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
