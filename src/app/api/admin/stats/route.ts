import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/rbac';
import { UserRole, AdminStats } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Require HR_ADMIN or higher
    const authResult = await requireAuth(request, UserRole.HR_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;

    // Get admin statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [
      totalUsers,
      totalAnalyses,
      totalErrors,
      analysesToday,
      usersToday,
      analysisByType,
      analysisByLanguage,
      errorAnalyses
    ] = await Promise.all([
      prisma.user.count(),
      prisma.analysis.count(),
      prisma.analysis.count({ where: { errorMessage: { not: null } } }),
      prisma.analysis.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.analysis.groupBy({
        by: ['analysisType'],
        _count: { id: true }
      }),
      prisma.analysis.groupBy({
        by: ['language'],
        _count: { id: true }
      }),
      prisma.analysis.findMany({
        where: { 
          skillGaps: { not: null },
          skillGaps: { not: '[]' }
        },
        select: { skillGaps: true },
        take: 1000
      })
    ]);

    // Process skill gaps to find most frequent
    const skillGapCounts: Record<string, number> = {};
    errorAnalyses.forEach(analysis => {
      if (analysis.skillGaps) {
        try {
          const gaps = JSON.parse(analysis.skillGaps) as string[];
          gaps.forEach(gap => {
            skillGapCounts[gap] = (skillGapCounts[gap] || 0) + 1;
          });
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    const mostFrequentSkillGaps = Object.entries(skillGapCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    const stats: AdminStats = {
      totalUsers,
      totalAnalyses,
      totalErrors,
      analysesToday,
      usersToday,
      mostFrequentSkillGaps,
      analysisByType: analysisByType.map(item => ({
        type: item.analysisType,
        count: item._count.id
      })),
      analysisByLanguage: analysisByLanguage.map(item => ({
        language: item.language,
        count: item._count.id
      }))
    };

    // Create audit log
    await createAuditLog(user, 'ADMIN_STATS_VIEWED', undefined, undefined, request);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
