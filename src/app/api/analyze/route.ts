import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeResume, analyzeResumeWithProgress } from '@/lib/resumeAnalysis';
import { requireAuth, createAuditLog, checkRateLimit } from '@/lib/rbac';
import { AnalysisType, UserRole } from '@/types';
import { ProgressTracker } from '../analysis-progress/[id]/route';

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

    // Check if AI analysis is requested but not available
    if (analysisType === AnalysisType.AI_POWERED) {
      try {
        const { LLMFactory } = await import('@/lib/llm');
        const activeClient = await LLMFactory.getActiveClient();
        if (!activeClient.isConfigured()) {
          return NextResponse.json(
            { success: false, message: 'AI analysis is not available. Please use standard analysis.' },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('LLM client check error:', error);
        return NextResponse.json(
          { success: false, message: 'AI analysis is not available. Please use standard analysis.' },
          { status: 400 }
        );
      }
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Create a temporary analysis record to get an ID for progress tracking
    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        filename: file.name,
        jobDescription: jobDescription || null,
        analysisType: analysisType as AnalysisType,
        language: language || 'en',
        
        // Temporary placeholder values
        overallScore: 0,
        keywordScore: 0,
        formattingScore: 0,
        readabilityScore: 0,
        actionVerbScore: 0,
        suggestions: '[]',
        keywordsFound: '[]',
        keywordsMissing: '[]',
        fileSize: file.size,
        processingTimeMs: 0
      }
    });

    // Initialize progress tracker
    const progressTracker = new ProgressTracker(analysis.id);
    
    // Return the analysis ID immediately so frontend can start polling
    const response = NextResponse.json({
      success: true,
      analysis: { id: analysis.id },
      message: 'Analysis started'
    });

    // Start the actual analysis in the background
    setImmediate(async () => {
      try {
        progressTracker.updateProgress('Starting analysis...', 10, 0);
        
        // Perform analysis with progress tracking
        const analysisResult = await analyzeResumeWithProgress(
          fileBuffer, 
          file.name, 
          jobDescription, 
          analysisType as AnalysisType,
          language,
          progressTracker
        );

        progressTracker.updateProgress('Saving results...', 95, 4);

        // Update analysis with real results
        await prisma.analysis.update({
          where: { id: analysis.id },
          data: {
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
            processingTimeMs: analysisResult.processingTimeMs,
            errorMessage: analysisResult.errorMessage
          }
        });

        progressTracker.setCompleted();

        // Create audit log
        await createAuditLog(
          user, 
          'ANALYSIS_CREATED', 
          `Analysis completed for ${file.name} using ${analysisType}`,
          { analysisId: analysis.id, filename: file.name, analysisType }
        );

      } catch (error) {
        console.error('Background analysis error:', error);
        progressTracker.setFailed(error instanceof Error ? error.message : 'Unknown error');
        
        // Update analysis with error
        await prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            errorMessage: error instanceof Error ? error.message : 'Analysis failed',
            processingTimeMs: Date.now() - progressTracker.getStartTime()
          }
        });
      }
    });

    return response;

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
