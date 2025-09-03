import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user's analyses
    const analyses = await prisma.analysis.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        overallScore: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      analyses
    });
  } catch (error) {
    console.error('Get analyses error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch analyses' },
      { status: 500 }
    );
  }
}
