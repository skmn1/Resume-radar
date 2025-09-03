import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeResume } from '@/lib/resumeAnalysis';
import { requireAuth, createAuditLog, checkRateLimit } from '@/lib/rbac';
import { AnalysisType, UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimit = await checkRateLimit(clientIP, 'ANALYSIS', 5, 60); // 5 analyses per hour for non-authenticated users
    
    // Authentication
    const authResult = await requireAuth(request, UserRole.USER);
    if ('error' in authResult) {
      // Check rate limit for unauthenticated users
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Rate limit exceeded. Please register/login for higher limits.',
            resetTime: rateLimit.resetTime
          },
          { status: 429 }
        );
      }
      return authResult.error;
    }

    const { user } = authResult;

    // Higher rate limit for authenticated users
    const userRateLimit = await checkRateLimit(user.id, 'ANALYSIS', 20, 60); // 20 analyses per hour
    if (!userRateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Analysis rate limit exceeded. Please try again later.',
          resetTime: userRateLimit.resetTime
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const jobDescription = formData.get('jobDescription') as string;
    const analysisType = (formData.get('analysisType') as string) || AnalysisType.STANDARD;
    const language = formData.get('language') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File size too large. Maximum 10MB allowed.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only PDF and DOCX files are supported.' },
        { status: 400 }
      );
    }

    // Validate analysis type
    if (!Object.values(AnalysisType).includes(analysisType as AnalysisType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid analysis type' },
        { status: 400 }
      );
    }

    // Check if AI analysis is requested but not available (e.g., no OpenAI key)
    if (analysisType === AnalysisType.AI_POWERED && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'AI analysis is not available. Please use standard analysis.' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Perform analysis
    const analysisResult = await analyzeResume(
      fileBuffer, 
      file.name, 
      jobDescription, 
      analysisType as AnalysisType,
      language
    );

    // Save analysis to database
    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        filename: file.name,
        jobDescription: jobDescription || null,
        analysisType: analysisType as AnalysisType,
        language: analysisResult.language,
        
        // Legacy fields
        overallScore: analysisResult.overallScore,
        keywordScore: analysisResult.keywordScore,
        formattingScore: analysisResult.formattingScore,
        readabilityScore: analysisResult.readabilityScore,
        actionVerbScore: analysisResult.actionVerbScore,
        suggestions: JSON.stringify(analysisResult.suggestions),
        keywordsFound: JSON.stringify(analysisResult.keywordsFound),
        keywordsMissing: JSON.stringify(analysisResult.keywordsMissing),
        
        // Enhanced fields
        aiAnalysisResult: analysisResult.aiAnalysisResult ? JSON.stringify(analysisResult.aiAnalysisResult) : null,
        fitScore: analysisResult.fitScore,
        overallRemark: analysisResult.overallRemark,
        skillGaps: analysisResult.skillGaps ? JSON.stringify(analysisResult.skillGaps) : null,
        coverLetterDraft: analysisResult.coverLetterDraft,
        
        // Metadata
        fileSize: file.size,
        processingTimeMs: analysisResult.processingTimeMs,
        errorMessage: analysisResult.errorMessage
      }
    });

    // Create audit log
    await createAuditLog(
      user, 
      'ANALYSIS_CREATED', 
      `analysis:${analysis.id}`, 
      { 
        analysisType, 
        filename: file.name, 
        fileSize: file.size,
        processingTime: analysisResult.processingTimeMs 
      }, 
      request
    );

    // Parse JSON fields for response
    const responseAnalysis = {
      ...analysis,
      suggestions: JSON.parse(analysis.suggestions),
      keywordsFound: JSON.parse(analysis.keywordsFound),
      keywordsMissing: JSON.parse(analysis.keywordsMissing),
      aiAnalysisResult: analysis.aiAnalysisResult ? JSON.parse(analysis.aiAnalysisResult) : null,
      skillGaps: analysis.skillGaps ? JSON.parse(analysis.skillGaps) : null
    };

    return NextResponse.json({
      success: true,
      analysis: responseAnalysis,
      processingTimeMs: analysisResult.processingTimeMs
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Create error audit log if user is available
    try {
      const authResult = await requireAuth(request, UserRole.USER);
      if ('user' in authResult) {
        await createAuditLog(
          authResult.user, 
          'ANALYSIS_ERROR', 
          undefined, 
          { error: error instanceof Error ? error.message : 'Unknown error' }, 
          request
        );
      }
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }
    
    return NextResponse.json(
      { success: false, message: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
