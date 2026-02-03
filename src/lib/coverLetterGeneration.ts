/**
 * AI-Powered Cover Letter Generation Service
 * Generates professional, personalized cover letters using RAG + LLM
 */

import { createRAGService } from './rag';
import { GoogleGenAI } from '@google/genai';
import { CoverLetterRequest, CoverLetterResult, CoverLetterSection } from '@/types/jobMatching';

/**
 * Get Gemini AI client for text generation
 */
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Extract company and job info from job description
 */
function extractJobInfo(jobDescription: string): { company?: string; title?: string } {
  const companyPatterns = [
    /(?:company|organization|employer):\s*([A-Z][A-Za-z\s&,\.]+)/i,
    /([A-Z][A-Za-z\s&,\.]+)\s+is\s+(?:seeking|hiring|looking for)/i,
    /Join\s+([A-Z][A-Za-z\s&,\.]+)/i
  ];
  
  const titlePatterns = [
    /(?:position|role|title):\s*([A-Z][A-Za-z\s]+)/i,
    /(?:hiring|seeking)\s+(?:a|an)?\s*([A-Z][A-Za-z\s]+)\s+(?:to|for)/i
  ];
  
  let company: string | undefined;
  let title: string | undefined;
  
  for (const pattern of companyPatterns) {
    const match = pattern.exec(jobDescription);
    if (match && match[1]) {
      company = match[1].trim();
      break;
    }
  }
  
  for (const pattern of titlePatterns) {
    const match = pattern.exec(jobDescription);
    if (match && match[1]) {
      title = match[1].trim();
      break;
    }
  }
  
  return { company, title };
}

/**
 * Generate professional cover letter using AI
 */
export async function generateCoverLetter(request: CoverLetterRequest): Promise<CoverLetterResult> {
  console.log('✍️ [CoverLetter] Generating professional cover letter...');
  
  const {
    resumeText,
    jobDescription,
    candidateName,
    candidateEmail,
    candidatePhone,
    companyName,
    jobTitle,
    hiringManagerName,
    additionalContext
  } = request;
  
  try {
    // Extract job info if not provided
    const jobInfo = extractJobInfo(jobDescription);
    const finalCompanyName = companyName || jobInfo.company || 'your company';
    const finalJobTitle = jobTitle || jobInfo.title || 'this position';
    
    // Initialize RAG to get relevant resume sections
    const ragService = createRAGService();
    await ragService.initialize(resumeText);
    
    // Retrieve relevant achievements and experiences
    const queries = [
      'key achievements and quantifiable results',
      'relevant technical skills and expertise',
      'professional experience and accomplishments'
    ];
    
    const relevantSections: string[] = [];
    
    for (const query of queries) {
      const result = await ragService.retrieveContext(query);
      if (result.contextText) {
        relevantSections.push(result.contextText);
      }
    }
    
    const resumeHighlights = relevantSections.join('\n\n').substring(0, 1500);
    
    // Construct expert AI prompt
    const prompt = `You are an expert career coach and professional cover letter writer with 15 years of experience helping candidates land their dream jobs.

Write a compelling, personalized cover letter for the following:

CANDIDATE INFORMATION:
Name: ${candidateName}
${candidateEmail ? `Email: ${candidateEmail}` : ''}
${candidatePhone ? `Phone: ${candidatePhone}` : ''}

JOB OPPORTUNITY:
Company: ${finalCompanyName}
Position: ${finalJobTitle}
${hiringManagerName ? `Hiring Manager: ${hiringManagerName}` : ''}

JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

CANDIDATE'S KEY QUALIFICATIONS (from resume):
${resumeHighlights}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

INSTRUCTIONS:
1. Write in first person from the candidate's perspective
2. Use a professional yet engaging business letter tone
3. Length: 250-400 words (3-4 concise paragraphs)
4. Structure:
   - Opening (1 paragraph): Express genuine interest and mention how you learned about the role
   - Body (2 paragraphs): Connect specific experiences and achievements to job requirements
   - Closing (1 paragraph): Express enthusiasm and include a call to action

5. Quality standards:
   - Include specific metrics and achievements from the candidate's background
   - Reference actual job requirements, not generic skills
   - Be confident but not arrogant
   - Make it sound human and authentic, not AI-generated
   - Avoid clichés like "I am writing to express my interest..." or "I believe I am a perfect fit..."
   - Use active voice and strong action verbs
   - Show knowledge of the company if information is available

6. Focus on VALUE: Every sentence should demonstrate how the candidate can contribute to the company's success

Generate ONLY the cover letter body (no headers, signatures, or dates - those will be added later).
Start directly with the opening paragraph.`;

    // Generate cover letter using LLM
    const gemini = getGeminiClient();
    console.log('   🤖 Generating with AI...');
    
    const response = await gemini.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    if (!response.text) {
      throw new Error('No response from AI');
    }
    
    const content = response.text.trim();
    
    // Parse content into sections
    const paragraphs = content.split('\n\n').filter((p: string) => p.trim().length > 0);
    
    const sections: CoverLetterSection[] = [];
    
    if (paragraphs.length > 0) {
      sections.push({
        type: 'opening',
        content: paragraphs[0]
      });
    }
    
    if (paragraphs.length > 2) {
      for (let i = 1; i < paragraphs.length - 1; i++) {
        sections.push({
          type: 'body',
          content: paragraphs[i]
        });
      }
    }
    
    if (paragraphs.length > 1) {
      sections.push({
        type: 'closing',
        content: paragraphs[paragraphs.length - 1]
      });
    }
    
    // Extract highlighted skills (simple keyword extraction)
    const skillKeywords = [
      'React', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'AWS', 'Docker', 'Kubernetes',
      'leadership', 'team', 'agile', 'scrum', 'ci/cd', 'testing', 'database', 'API'
    ];
    
    const highlightedSkills = skillKeywords.filter(skill =>
      content.toLowerCase().includes(skill.toLowerCase())
    );
    
    // Count words
    const wordCount = content.split(/\s+/).length;
    
    // Generate suggestions
    const suggestions: string[] = [];
    
    if (wordCount < 250) {
      suggestions.push('Consider adding more specific examples from your experience');
    } else if (wordCount > 450) {
      suggestions.push('Consider condensing to stay within 400 words for maximum impact');
    }
    
    if (highlightedSkills.length < 3) {
      suggestions.push('Add more specific technical skills relevant to the role');
    }
    
    if (!content.includes(finalCompanyName)) {
      suggestions.push(`Mention ${finalCompanyName} by name to show genuine interest`);
    }
    
    // Cleanup
    ragService.dispose();
    
    console.log(`   ✅ Generated ${wordCount} word cover letter`);
    console.log(`   🎯 Highlighted ${highlightedSkills.length} skills`);
    
    const result: CoverLetterResult = {
      id: `cover_${Date.now()}`,
      content,
      sections,
      wordCount,
      highlightedSkills,
      suggestions,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return result;
  } catch (error) {
    console.error('❌ [CoverLetter] Generation failed:', error);
    throw new Error(`Failed to generate cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format cover letter with headers and signature
 */
export function formatCoverLetterForExport(
  coverLetter: CoverLetterResult,
  candidateName: string,
  candidateEmail?: string,
  candidatePhone?: string,
  candidateAddress?: string,
  companyName?: string,
  companyAddress?: string,
  hiringManagerName?: string,
  includeDate: boolean = true,
  includeSignature: boolean = true
): string {
  const parts: string[] = [];
  
  // Candidate contact info
  parts.push(candidateName);
  if (candidateEmail) parts.push(candidateEmail);
  if (candidatePhone) parts.push(candidatePhone);
  if (candidateAddress) parts.push(candidateAddress);
  parts.push(''); // Empty line
  
  // Date
  if (includeDate) {
    const date = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    parts.push(date);
    parts.push(''); // Empty line
  }
  
  // Recipient info
  if (hiringManagerName || companyName) {
    if (hiringManagerName) parts.push(hiringManagerName);
    if (companyName) parts.push(companyName);
    if (companyAddress) parts.push(companyAddress);
    parts.push(''); // Empty line
  }
  
  // Greeting
  const greeting = hiringManagerName
    ? `Dear ${hiringManagerName},`
    : 'Dear Hiring Manager,';
  parts.push(greeting);
  parts.push(''); // Empty line
  
  // Body
  parts.push(coverLetter.content);
  parts.push(''); // Empty line
  
  // Closing
  if (includeSignature) {
    parts.push('Sincerely,');
    parts.push(''); // Empty line
    parts.push(candidateName);
  }
  
  return parts.join('\n');
}
