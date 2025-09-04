import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    // Get specific analysis
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: id,
        userId: decoded.userId
      }
    });

    if (!analysis) {
      return NextResponse.json(
        { success: false, message: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const analysisWithParsedFields = {
      ...analysis,
      suggestions: JSON.parse(analysis.suggestions),
      keywordsFound: JSON.parse(analysis.keywordsFound),
      keywordsMissing: JSON.parse(analysis.keywordsMissing)
    };

    return NextResponse.json({
      success: true,
      analysis: analysisWithParsedFields
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}
