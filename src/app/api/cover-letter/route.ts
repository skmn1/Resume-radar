import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetter } from '@/lib/coverLetterGeneration';
import { CoverLetterRequest } from '@/types/jobMatching';

export async function POST(req: NextRequest) {
  try {
    const body: CoverLetterRequest = await req.json();
    
    // Validate required fields
    if (!body.resumeText || !body.jobDescription) {
      return NextResponse.json(
        { error: 'Resume text and job description are required' },
        { status: 400 }
      );
    }

    if (!body.candidateName) {
      return NextResponse.json(
        { error: 'Candidate name is required' },
        { status: 400 }
      );
    }

    // Generate cover letter
    const result = await generateCoverLetter(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate cover letter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
