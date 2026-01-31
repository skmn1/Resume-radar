import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { Analysis, Suggestion, KeywordMatch, FormattingIssue, AnalysisType, AIAnalysisResult } from '@/types';
import { generateAIAnalysis, generateStandardAnalysis } from './aiAnalysis';
import { detectLanguage, detectMixedLanguages } from './languageDetection';

// Import ProgressTracker type
interface ProgressTracker {
  updateProgress(step: string, progress: number, currentStepIndex?: number): void;
}

interface AnalysisInput {
  text: string;
  jobDescription?: string;
  analysisType?: AnalysisType;
  language?: string;
}

// Common tech keywords and action verbs
const TECH_KEYWORDS = [
  'javascript', 'typescript', 'react', 'nextjs', 'nodejs', 'python', 'java', 'css', 'html',
  'sql', 'mongodb', 'postgresql', 'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum',
  'api', 'rest', 'graphql', 'microservices', 'devops', 'ci/cd', 'testing', 'automation',
  'machine learning', 'ai', 'data analysis', 'cloud computing', 'cybersecurity'
];

const ACTION_VERBS = [
  'achieved', 'analyzed', 'built', 'created', 'designed', 'developed', 'engineered', 'established',
  'executed', 'generated', 'implemented', 'improved', 'increased', 'launched', 'led', 'managed',
  'optimized', 'organized', 'planned', 'reduced', 'streamlined', 'supervised', 'transformed'
];

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
  'typescript': ['ts'],
  'react': ['reactjs', 'react.js'],
  'nextjs': ['next.js', 'next'],
  'nodejs': ['node.js', 'node'],
  'python': ['py'],
  'sql': ['structured query language', 'mysql', 'sqlite'],
  'api': ['application programming interface', 'apis'],
  'ui': ['user interface'],
  'ux': ['user experience'],
  'ai': ['artificial intelligence'],
  'ml': ['machine learning']
};

/**
 * Parse uploaded file and extract text content
 */
export async function parseFile(file: Buffer, filename: string): Promise<string> {
  const extension = filename.toLowerCase().split('.').pop();
  
  try {
    if (extension === 'pdf') {
      const data = await pdf(file);
      return data.text;
    } else if (extension === 'docx') {
      const result = await mammoth.extractRawText({ buffer: file });
      return result.value;
    } else {
      throw new Error('Unsupported file format. Please upload PDF or DOCX files.');
    }
  } catch (error) {
    throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract keywords from job description
 */
export function extractJobKeywords(jobDescription: string): string[] {
  if (!jobDescription) return [];
  
  const text = jobDescription.toLowerCase();
  const keywords = new Set<string>();
  
  // Extract tech keywords
  TECH_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      keywords.add(keyword);
    }
  });
  
  // Extract synonyms
  Object.entries(KEYWORD_SYNONYMS).forEach(([main, synonyms]) => {
    synonyms.forEach(synonym => {
      if (text.includes(synonym.toLowerCase())) {
        keywords.add(main);
      }
    });
  });
  
  // Extract custom keywords (words that appear frequently)
  const words = text.match(/\b[a-z]{3,}\b/g) || [];
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Add words that appear more than once and aren't common words
  const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
  
  Object.entries(wordCount).forEach(([word, count]) => {
    if (count > 1 && !commonWords.includes(word) && word.length > 3) {
      keywords.add(word);
    }
  });
  
  return Array.from(keywords);
}

/**
 * Analyze keyword matches in resume
 */
export function analyzeKeywords(resumeText: string, targetKeywords: string[]): KeywordMatch[] {
  const text = resumeText.toLowerCase();
  
  return targetKeywords.map(keyword => {
    const mainKeywordCount = (text.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    
    // Check synonyms
    const synonyms = KEYWORD_SYNONYMS[keyword] || [];
    let synonymCount = 0;
    synonyms.forEach(synonym => {
      synonymCount += (text.match(new RegExp(synonym.toLowerCase(), 'g')) || []).length;
    });
    
    const totalCount = mainKeywordCount + synonymCount;
    
    return {
      keyword,
      found: totalCount > 0,
      synonyms,
      count: totalCount
    };
  });
}

/**
 * Analyze formatting issues
 */
export function analyzeFormatting(resumeText: string): FormattingIssue[] {
  const issues: FormattingIssue[] = [];
  
  // Check for excessive use of special characters
  const specialCharCount = (resumeText.match(/[★☆●○■□▪▫•‣⁃]/g) || []).length;
  if (specialCharCount > 20) {
    issues.push({
      type: 'special_characters',
      description: 'Excessive use of special characters may confuse ATS systems',
      severity: 'medium'
    });
  }
  
  // Check for table-like structures (multiple tabs or excessive spaces)
  const tabCount = (resumeText.match(/\t/g) || []).length;
  const multipleSpaces = (resumeText.match(/  +/g) || []).length;
  if (tabCount > 10 || multipleSpaces > 20) {
    issues.push({
      type: 'table_structure',
      description: 'Complex table structures may not be parsed correctly by ATS',
      severity: 'high'
    });
  }
  
  // Check for graphics or unusual formatting indicators
  const graphicsIndicators = ['image', 'chart', 'graph', 'table'];
  const hasGraphics = graphicsIndicators.some(indicator => 
    resumeText.toLowerCase().includes(indicator)
  );
  if (hasGraphics) {
    issues.push({
      type: 'graphics',
      description: 'Graphics and charts may not be readable by ATS systems',
      severity: 'high'
    });
  }
  
  // Check line length (too long lines might indicate formatting issues)
  const lines = resumeText.split('\n');
  const longLines = lines.filter(line => line.length > 100).length;
  if (longLines > lines.length * 0.3) {
    issues.push({
      type: 'line_length',
      description: 'Very long lines may indicate formatting issues',
      severity: 'low'
    });
  }
  
  return issues;
}

/**
 * Calculate readability score using a simplified Flesch Reading Ease formula
 */
export function calculateReadabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  // Simplified Flesch Reading Ease formula
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  // Convert to 0-100 scale where higher is better for professional documents
  return Math.max(0, Math.min(100, score)) / 100;
}

/**
 * Count syllables in a word (simplified)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Handle silent 'e'
  if (word.endsWith('e')) {
    count--;
  }
  
  return Math.max(1, count);
}

/**
 * Analyze action verb usage
 */
export function analyzeActionVerbs(resumeText: string): { score: number; verbsFound: string[] } {
  const text = resumeText.toLowerCase();
  const lines = text.split('\n');
  
  const verbsFound = new Set<string>();
  let bulletPoints = 0;
  let bulletPointsWithActionVerbs = 0;
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    // Check if line looks like a bullet point
    if (trimmedLine.match(/^[•\-\*]/) || trimmedLine.match(/^\d+\./) || 
        (trimmedLine.length > 10 && trimmedLine.length < 150)) {
      bulletPoints++;
      
      // Check if starts with action verb
      const firstWord = trimmedLine.split(/\s+/)[0]?.replace(/[^a-z]/g, '') || '';
      if (ACTION_VERBS.includes(firstWord)) {
        bulletPointsWithActionVerbs++;
        verbsFound.add(firstWord);
      }
    }
  });
  
  const score = bulletPoints > 0 ? bulletPointsWithActionVerbs / bulletPoints : 0;
  return { score, verbsFound: Array.from(verbsFound) };
}

/**
 * Generate suggestions based on analysis
 */
export function generateSuggestions(
  keywordMatches: KeywordMatch[],
  formattingIssues: FormattingIssue[],
  readabilityScore: number,
  actionVerbAnalysis: { score: number; verbsFound: string[] }
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Keyword suggestions
  const missingKeywords = keywordMatches.filter(k => !k.found);
  if (missingKeywords.length > 0) {
    suggestions.push({
      type: 'keyword',
      priority: 'high',
      title: 'Add Missing Keywords',
      description: `Your resume is missing ${missingKeywords.length} important keywords from the job description.`,
      suggestion: `Consider adding these keywords naturally throughout your resume: ${missingKeywords.slice(0, 5).map(k => k.keyword).join(', ')}`
    });
  }
  
  // Formatting suggestions
  formattingIssues.forEach(issue => {
    suggestions.push({
      type: 'formatting',
      priority: issue.severity as 'high' | 'medium' | 'low',
      title: 'Formatting Issue',
      description: issue.description,
      suggestion: getFormattingSuggestion(issue.type)
    });
  });
  
  // Readability suggestions
  if (readabilityScore < 0.6) {
    suggestions.push({
      type: 'readability',
      priority: 'medium',
      title: 'Improve Readability',
      description: 'Your resume may be difficult to read due to complex sentence structure.',
      suggestion: 'Use shorter sentences and simpler words. Aim for clear, concise bullet points.'
    });
  }
  
  // Action verb suggestions
  if (actionVerbAnalysis.score < 0.5) {
    suggestions.push({
      type: 'action_verb',
      priority: 'medium',
      title: 'Use More Action Verbs',
      description: 'Start more bullet points with strong action verbs to make your achievements stand out.',
      suggestion: `Try starting bullet points with words like: ${ACTION_VERBS.slice(0, 5).join(', ')}`
    });
  }
  
  return suggestions;
}

function getFormattingSuggestion(issueType: string): string {
  switch (issueType) {
    case 'special_characters':
      return 'Replace special bullet points with simple hyphens (-) or asterisks (*).';
    case 'table_structure':
      return 'Avoid complex tables. Use simple bullet points and clear section headers instead.';
    case 'graphics':
      return 'Remove graphics, charts, and images. Use text descriptions of your achievements instead.';
    case 'line_length':
      return 'Break up long lines into shorter, more readable bullet points.';
    default:
      return 'Simplify the formatting to ensure ATS compatibility.';
  }
}

/**
 * Main function to analyze a resume with enhanced AI capabilities
 */
export async function analyzeResume(
  fileBuffer: Buffer,
  filename: string,
  jobDescription?: string,
  analysisType: AnalysisType = AnalysisType.STANDARD,
  language?: string
): Promise<Omit<Analysis, 'id' | 'userId' | 'createdAt'>> {
  const startTime = Date.now();

  try {
    // Parse the resume file
    const resumeText = await parseFile(fileBuffer, filename);
    
    if (!resumeText || resumeText.trim().length === 0) {
      throw new Error('No text content found in resume');
    }

    // Detect language
    const languageDetection = detectLanguage(resumeText);
    const detectedLanguage = language || languageDetection.language;
    const mixedLanguages = detectMixedLanguages(resumeText);

    // Generate AI analysis if requested
    let aiAnalysisResult: AIAnalysisResult | undefined;
    let fitScore: number | undefined;
    let overallRemark: string | undefined;
    let skillGaps: string[] | undefined;
    let coverLetterDraft: string | undefined;

    if (analysisType === AnalysisType.AI_POWERED) {
      try {
        aiAnalysisResult = await generateAIAnalysis({
          resumeText,
          jobDescription,
          language: detectedLanguage,
          analysisType
        });
        
        fitScore = aiAnalysisResult.fitScore;
        overallRemark = aiAnalysisResult.overallRemark;
        skillGaps = aiAnalysisResult.skillGaps;
        coverLetterDraft = aiAnalysisResult.coverLetterDraft;
      } catch (aiError) {
        console.error('AI analysis failed, falling back to standard analysis:', aiError);
        // Fall back to standard analysis
        aiAnalysisResult = generateStandardAnalysis(resumeText, jobDescription);
        fitScore = aiAnalysisResult.fitScore;
        overallRemark = aiAnalysisResult.overallRemark;
      }
    }

    // Always perform standard analysis for backwards compatibility
    const targetKeywords = jobDescription ? extractJobKeywords(jobDescription) : TECH_KEYWORDS;
    const keywordMatches = analyzeKeywords(resumeText, targetKeywords);
    const formattingIssues = analyzeFormatting(resumeText);
    const readabilityScore = calculateReadabilityScore(resumeText);
    const actionVerbAnalysis = analyzeActionVerbs(resumeText);
    
    // Calculate scores
    const keywordScore = keywordMatches.filter(k => k.found).length / Math.max(keywordMatches.length, 1);
    const formattingScore = Math.max(0, 1 - (formattingIssues.length * 0.1));
    const actionVerbScore = actionVerbAnalysis.score;
    
    // Calculate overall score (weighted average)
    const overallScore = (
      keywordScore * 0.4 +
      formattingScore * 0.3 +
      readabilityScore * 0.2 +
      actionVerbScore * 0.1
    );

    // Generate suggestions
    const suggestions = generateSuggestions(
      keywordMatches,
      formattingIssues,
      readabilityScore,
      actionVerbAnalysis
    );

    const processingTime = Date.now() - startTime;

    return {
      filename,
      jobDescription,
      analysisType,
      language: detectedLanguage,
      
      // Legacy scoring
      overallScore,
      keywordScore,
      formattingScore,
      readabilityScore,
      actionVerbScore,
      suggestions,
      keywordsFound: keywordMatches.filter(k => k.found).map(k => k.keyword),
      keywordsMissing: keywordMatches.filter(k => !k.found).map(k => k.keyword),
      
      // Enhanced AI analysis
      aiAnalysisResult,
      fitScore,
      overallRemark,
      skillGaps,
      coverLetterDraft,
      
      // Metadata
      processingTimeMs: processingTime,
      errorMessage: mixedLanguages.length > 1 
        ? `Mixed languages detected: ${mixedLanguages.join(', ')}. Analysis performed in ${detectedLanguage}.`
        : undefined
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('Resume analysis failed:', error);
    
    // Return minimal analysis with error
    return {
      filename,
      jobDescription,
      analysisType,
      language: language || 'en',
      
      overallScore: 0,
      keywordScore: 0,
      formattingScore: 0,
      readabilityScore: 0,
      actionVerbScore: 0,
      suggestions: [],
      keywordsFound: [],
      keywordsMissing: [],
      
      processingTimeMs: processingTime,
      errorMessage: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Enhanced version of analyzeResume with progress tracking
 */
export async function analyzeResumeWithProgress(
  fileBuffer: Buffer,
  filename: string,
  jobDescription?: string,
  analysisType: AnalysisType = AnalysisType.STANDARD,
  language?: string,
  progressTracker?: ProgressTracker
): Promise<Omit<Analysis, 'id' | 'userId' | 'createdAt'>> {
  const startTime = Date.now();

  try {
    // Step 1: Parse the resume file (20%)
    progressTracker?.updateProgress('Parsing resume file...', 20, 0);
    const resumeText = await parseFile(fileBuffer, filename);
    
    if (!resumeText || resumeText.trim().length === 0) {
      throw new Error('No text content found in resume');
    }

    // Step 2: Language detection (30%)
    progressTracker?.updateProgress('Detecting language and analyzing content...', 30, 1);
    const languageDetection = detectLanguage(resumeText);
    const detectedLanguage = language || languageDetection.language;
    const mixedLanguages = detectMixedLanguages(resumeText);

    // Step 3: Content analysis (50%)
    progressTracker?.updateProgress('Analyzing content structure...', 50, 2);
    
    // Generate AI analysis if requested
    let aiAnalysisResult: AIAnalysisResult | undefined;
    let fitScore: number | undefined;
    let overallRemark: string | undefined;
    let skillGaps: string[] | undefined;
    let coverLetterDraft: string | undefined;

    if (analysisType === AnalysisType.AI_POWERED) {
      // Step 4: AI Processing (80%)
      progressTracker?.updateProgress('Processing with AI analysis...', 80, 3);
      
      try {
        aiAnalysisResult = await generateAIAnalysis({
          resumeText,
          jobDescription,
          language: detectedLanguage,
          analysisType
        });
        
        fitScore = aiAnalysisResult.fitScore;
        overallRemark = aiAnalysisResult.overallRemark;
        skillGaps = aiAnalysisResult.skillGaps;
        coverLetterDraft = aiAnalysisResult.coverLetterDraft;
      } catch (error) {
        console.error('AI analysis failed, falling back to standard analysis:', error);
        progressTracker?.updateProgress('AI analysis failed, using standard analysis...', 80, 3);
        
        const standardResult = generateStandardAnalysis(resumeText, jobDescription);
        aiAnalysisResult = standardResult;
        fitScore = standardResult.fitScore;
        overallRemark = standardResult.overallRemark;
        skillGaps = standardResult.skillGaps;
      }
    }

    // Standard analysis components
    const targetKeywords = jobDescription ? extractJobKeywords(jobDescription) : TECH_KEYWORDS.slice(0, 10);
    const keywordMatches = analyzeKeywords(resumeText, targetKeywords);
    const formattingIssues = analyzeFormatting(resumeText);
    const readabilityScore = calculateReadabilityScore(resumeText);
    const actionVerbAnalysis = analyzeActionVerbs(resumeText);

    // Calculate scores
    const keywordScore = keywordMatches.filter(k => k.found).length / keywordMatches.length;
    const formattingScore = Math.max(0, 1 - (formattingIssues.length * 0.1));
    const actionVerbScore = actionVerbAnalysis.score;
    const overallScore = (keywordScore + formattingScore + readabilityScore + actionVerbScore) / 4;

    // Generate suggestions
    const suggestions = generateSuggestions(keywordMatches, formattingIssues, readabilityScore, actionVerbAnalysis);

    const processingTime = Date.now() - startTime;

    // Step 5: Compiling results (90%)
    progressTracker?.updateProgress('Compiling results...', 90, 4);

    return {
      filename,
      jobDescription: jobDescription || undefined,
      analysisType,
      language: detectedLanguage,
      
      overallScore,
      keywordScore,
      formattingScore,
      readabilityScore,
      actionVerbScore,
      
      suggestions,
      keywordsFound: keywordMatches.filter(k => k.found).map(k => k.keyword),
      keywordsMissing: keywordMatches.filter(k => !k.found).map(k => k.keyword),
      
      // Enhanced fields from AI analysis
      aiAnalysisResult,
      fitScore,
      overallRemark,
      skillGaps,
      coverLetterDraft,
      
      processingTimeMs: processingTime
    };

  } catch (error) {
    console.error('Resume analysis error:', error);
    const processingTime = Date.now() - startTime;
    
    progressTracker?.updateProgress('Analysis failed', 0, undefined);
    
    return {
      filename,
      jobDescription: jobDescription || undefined,
      analysisType,
      language: language || 'en',
      
      overallScore: 0,
      keywordScore: 0,
      formattingScore: 0,
      readabilityScore: 0,
      actionVerbScore: 0,
      suggestions: [],
      keywordsFound: [],
      keywordsMissing: [],
      
      processingTimeMs: processingTime,
      errorMessage: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
