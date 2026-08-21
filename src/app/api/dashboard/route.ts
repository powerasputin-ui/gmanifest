import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      totalDocuments,
      documentsByStatus,
      avgProcessingTime,
      totalRuns,
      completedRuns,
      errorRuns,
      reviewRuns,
      runsByProfile,
      recentDocuments,
    ] = await Promise.all([
      db.document.count(),

      db.document.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      db.extractionRun.aggregate({
        where: { status: { in: ['completed', 'review'] } },
        _avg: { processingTime: true },
      }),

      db.extractionRun.count(),

      db.extractionRun.count({ where: { status: 'completed' } }),

      db.extractionRun.count({ where: { status: 'error' } }),

      db.extractionRun.count({ where: { status: 'review' } }),

      db.extractionRun.groupBy({
        by: ['profileId'],
        _count: { profileId: true },
      }),

      db.document.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const successRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

    // Enrich runsByProfile with profile names
    const profileIds = runsByProfile.map((r) => r.profileId);
    const profiles = profileIds.length > 0
      ? await db.extractionProfile.findMany({
          where: { id: { in: profileIds } },
          select: { id: true, name: true },
        })
      : [];

    const profileMap = new Map(profiles.map((p) => [p.id, p.name]));
    const enrichedRunsByProfile = runsByProfile.map((r) => ({
      profileId: r.profileId,
      profileName: profileMap.get(r.profileId) || 'Unknown',
      count: r._count.profileId,
    }));

    return NextResponse.json({
      totalDocuments,
      documentsByStatus: documentsByStatus.map((d) => ({
        status: d.status,
        count: d._count.status,
      })),
      averageProcessingTime: avgProcessingTime._avg.processingTime || 0,
      successRate: Math.round(successRate * 100) / 100,
      documentsInReview: reviewRuns,
      totalRuns,
      completedRuns,
      errorRuns,
      runsByProfile: enrichedRunsByProfile,
      recentDocuments,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get dashboard data' },
      { status: 500 }
    );
  }
}
