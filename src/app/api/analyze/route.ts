import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { analyzeResume } from '@/lib/resumeAnalysis';

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const jobDescription = formData.get('jobDescription') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Please upload PDF or DOCX files.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File too large. Please upload files smaller than 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Analyze resume
    const analysisResult = await analyzeResume(fileBuffer, file.name, jobDescription);

    // Save analysis to database
    const analysis = await prisma.analysis.create({
      data: {
        userId: decoded.userId,
        filename: file.name,
        jobDescription: jobDescription || null,
        overallScore: analysisResult.overallScore,
        keywordScore: analysisResult.keywordScore,
        formattingScore: analysisResult.formattingScore,
        readabilityScore: analysisResult.readabilityScore,
        actionVerbScore: analysisResult.actionVerbScore,
        suggestions: JSON.stringify(analysisResult.suggestions),
        keywordsFound: JSON.stringify(analysisResult.keywordsFound),
        keywordsMissing: JSON.stringify(analysisResult.keywordsMissing)
      }
    });

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        suggestions: analysisResult.suggestions,
        keywordsFound: analysisResult.keywordsFound,
        keywordsMissing: analysisResult.keywordsMissing
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
