/**
 * Job Matching Engine
 * Analyzes job descriptions and compares them against resumes using RAG
 */

import { createRAGService, RAGService } from './rag';
import { JobRequirement, JobMatchResult } from '@/types/jobMatching';

/**
 * Extract requirements from job description
 */
export function extractJobRequirements(jobDescription: string): JobRequirement[] {
  console.log('📋 [JobMatching] Extracting requirements from job description...');
  
  const requirements: JobRequirement[] = [];
  const lines = jobDescription.split('\n');
  let requirementId = 0;
  
  // Common requirement patterns
  const skillPatterns = [
    /(?:proficiency|experience|knowledge|expertise|skilled?|familiar)\s+(?:in|with|using)\s+([A-Z][A-Za-z0-9+#\.]*(?:\s+[A-Z][A-Za-z0-9+#\.]*)*)/gi,
    /(?:must have|should have|requires?)\s+(?:experience with|knowledge of)\s+([A-Z][A-Za-z0-9+#\.]*(?:\s+[A-Z][A-Za-z0-9+#\.]*)*)/gi,
    /([A-Z][A-Za-z0-9+#\.]*(?:\s+[A-Z][A-Za-z0-9+#\.]*)*)\s+(?:experience|knowledge|skills?)/gi
  ];
  
  const experiencePatterns = [
    /(\d+)\+?\s+(?:years?|yrs?)\s+(?:of)?\s+(?:experience|exp)/gi,
    /(?:minimum|at least)\s+(\d+)\s+(?:years?|yrs?)/gi
  ];
  
  const educationPatterns = [
    /(bachelor'?s?|master'?s?|phd|doctorate)\s+(?:degree)?\s+(?:in)?\s+([A-Za-z\s]+)/gi,
    /(bs|ba|ms|ma|mba|phd)\s+(?:in)?\s+([A-Za-z\s]+)/gi
  ];
  
  // Extract skills
  for (const pattern of skillPatterns) {
    let match;
    while ((match = pattern.exec(jobDescription)) !== null) {
      const skill = match[1].trim();
      if (skill.length > 2 && skill.length < 50) {
        requirements.push({
          id: `req_${requirementId++}`,
          category: 'skill',
          text: skill,
          priority: jobDescription.toLowerCase().includes('require') ? 'required' : 'preferred',
          foundInResume: false,
          matchScore: 0
        });
      }
    }
  }
  
  // Extract experience requirements
  for (const pattern of experiencePatterns) {
    let match;
    while ((match = pattern.exec(jobDescription)) !== null) {
      const years = match[1];
      requirements.push({
        id: `req_${requirementId++}`,
        category: 'experience',
        text: `${years}+ years of experience`,
        priority: 'required',
        foundInResume: false,
        matchScore: 0
      });
    }
  }
  
  // Extract education requirements
  for (const pattern of educationPatterns) {
    let match;
    while ((match = pattern.exec(jobDescription)) !== null) {
      const degree = match[1];
      const field = match[2]?.trim() || 'relevant field';
      requirements.push({
        id: `req_${requirementId++}`,
        category: 'education',
        text: `${degree} in ${field}`,
        priority: 'required',
        foundInResume: false,
        matchScore: 0
      });
    }
  }
  
  // Remove duplicates
  const unique = requirements.filter((req, index, self) =>
    index === self.findIndex((r) => r.text.toLowerCase() === req.text.toLowerCase())
  );
  
  console.log(`   ✅ Extracted ${unique.length} requirements`);
  return unique;
}

/**
 * Match requirements against resume using RAG
 */
export async function matchRequirementsToResume(
  requirements: JobRequirement[],
  resumeText: string,
  ragService: RAGService
): Promise<JobRequirement[]> {
  console.log('🔍 [JobMatching] Matching requirements to resume...');
  
  const matched: JobRequirement[] = [];
  
  for (const req of requirements) {
    try {
      // Use RAG to find evidence of this requirement in resume
      const query = `experience and skills related to ${req.text}`;
      const result = await ragService.retrieveContext(query);
      
      if (result.contextText && result.contextText.length > 0) {
        // Calculate match score based on context length and relevance
        const relevance = result.retrievedChunks.length > 0 
          ? result.retrievedChunks[0].score 
          : 0;
        
        const matchScore = Math.min(1, relevance * 1.5); // Boost score slightly
        
        matched.push({
          ...req,
          foundInResume: matchScore > 0.5,
          matchScore,
          resumeEvidence: result.contextText.substring(0, 200) + '...',
          sectionReference: result.retrievedChunks[0]?.chunk.metadata?.sectionType || 'UNKNOWN'
        });
        
        console.log(`   ${matchScore > 0.5 ? '✅' : '⚠️'} ${req.text}: ${(matchScore * 100).toFixed(0)}% match`);
      } else {
        matched.push({
          ...req,
          foundInResume: false,
          matchScore: 0
        });
        console.log(`   ❌ ${req.text}: Not found`);
      }
    } catch (error) {
      console.error(`   ⚠️ Error matching requirement "${req.text}":`, error);
      matched.push({
        ...req,
        foundInResume: false,
        matchScore: 0
      });
    }
  }
  
  return matched;
}

/**
 * Calculate overall job match score
 */
export function calculateMatchScore(requirements: JobRequirement[]): JobMatchResult {
  console.log('📊 [JobMatching] Calculating match scores...');
  
  if (requirements.length === 0) {
    return {
      overallMatch: 0,
      skillsMatch: 0,
      experienceMatch: 0,
      educationMatch: 0,
      requirements: [],
      strengths: [],
      gaps: [],
      recommendations: []
    };
  }
  
  // Separate by category
  const skills = requirements.filter(r => r.category === 'skill');
  const experience = requirements.filter(r => r.category === 'experience');
  const education = requirements.filter(r => r.category === 'education');
  
  // Calculate category scores
  const skillsMatch = skills.length > 0
    ? (skills.reduce((sum, r) => sum + r.matchScore, 0) / skills.length) * 100
    : 100;
  
  const experienceMatch = experience.length > 0
    ? (experience.reduce((sum, r) => sum + r.matchScore, 0) / experience.length) * 100
    : 100;
  
  const educationMatch = education.length > 0
    ? (education.reduce((sum, r) => sum + r.matchScore, 0) / education.length) * 100
    : 100;
  
  // Calculate weighted overall match
  const overallMatch = (
    skillsMatch * 0.5 +
    experienceMatch * 0.3 +
    educationMatch * 0.2
  );
  
  // Identify strengths (high match score)
  const strengths = requirements
    .filter(r => r.matchScore > 0.7 && r.foundInResume)
    .map(r => `Strong match for ${r.text}${r.resumeEvidence ? ': ' + r.resumeEvidence.substring(0, 100) : ''}`);
  
  // Identify gaps (missing or low match)
  const gaps = requirements
    .filter(r => !r.foundInResume || r.matchScore < 0.5)
    .map(r => r.text);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  const missingRequired = requirements.filter(r => r.priority === 'required' && !r.foundInResume);
  if (missingRequired.length > 0) {
    recommendations.push(`Add ${missingRequired.length} missing required qualifications to your resume`);
  }
  
  const weakMatches = requirements.filter(r => r.foundInResume && r.matchScore < 0.7);
  if (weakMatches.length > 0) {
    recommendations.push(`Strengthen evidence for ${weakMatches.length} partially-matched qualifications`);
  }
  
  if (skillsMatch < 70) {
    recommendations.push('Focus on highlighting relevant technical skills');
  }
  
  if (experienceMatch < 70) {
    recommendations.push('Add more details about years of experience and specific achievements');
  }
  
  console.log(`   📊 Overall Match: ${overallMatch.toFixed(0)}%`);
  console.log(`   🎯 Skills: ${skillsMatch.toFixed(0)}%, Experience: ${experienceMatch.toFixed(0)}%, Education: ${educationMatch.toFixed(0)}%`);
  console.log(`   ✅ Strengths: ${strengths.length}`);
  console.log(`   ⚠️ Gaps: ${gaps.length}`);
  
  return {
    overallMatch,
    skillsMatch,
    experienceMatch,
    educationMatch,
    requirements,
    strengths,
    gaps,
    recommendations
  };
}

/**
 * Main function: Analyze job match
 */
export async function analyzeJobMatch(
  resumeText: string,
  jobDescription: string
): Promise<JobMatchResult> {
  console.log('🎯 [JobMatching] Starting job match analysis...');
  
  try {
    // Initialize RAG with resume
    const ragService = createRAGService();
    await ragService.initialize(resumeText);
    
    // Extract requirements from job description
    const requirements = extractJobRequirements(jobDescription);
    
    if (requirements.length === 0) {
      console.warn('   ⚠️ No clear requirements found in job description');
    }
    
    // Match requirements to resume
    const matchedRequirements = await matchRequirementsToResume(requirements, resumeText, ragService);
    
    // Calculate scores
    const matchResult = calculateMatchScore(matchedRequirements);
    
    // Cleanup
    ragService.dispose();
    
    console.log('✅ [JobMatching] Analysis complete!');
    return matchResult;
  } catch (error) {
    console.error('❌ [JobMatching] Analysis failed:', error);
    throw error;
  }
}
