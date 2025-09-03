import OpenAI from 'openai';
import { AIAnalysisResult, AnalysisType } from '@/types';
import { detectLanguage } from './languageDetection';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIAnalysisInput {
  resumeText: string;
  jobDescription?: string;
  language: string;
  analysisType: AnalysisType;
}

/**
 * Generate AI-powered resume analysis using OpenAI
 */
export async function generateAIAnalysis(input: AIAnalysisInput): Promise<AIAnalysisResult> {
  const { resumeText, jobDescription, language, analysisType } = input;
  
  if (analysisType !== AnalysisType.AI_POWERED) {
    throw new Error('AI analysis only available for AI_POWERED analysis type');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Detect resume language if not provided
  const detectedLanguage = detectLanguage(resumeText);
  const actualLanguage = language || detectedLanguage.language;

  const prompt = createAnalysisPrompt(resumeText, jobDescription, actualLanguage);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(actualLanguage)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    const parsedResult = JSON.parse(result) as AIAnalysisResult;
    
    // Validate and sanitize the result
    return validateAndSanitizeResult(parsedResult, actualLanguage);
    
  } catch (error) {
    console.error('AI Analysis Error:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create the analysis prompt based on language and job description
 */
function createAnalysisPrompt(resumeText: string, jobDescription?: string, language: string = 'en'): string {
  const isEnglish = language === 'en';
  
  const basePrompt = isEnglish 
    ? `Analyze the following resume${jobDescription ? ' against this job description' : ''}:`
    : `Analysez le CV suivant${jobDescription ? ' par rapport à cette description de poste' : ''}:`;

  let prompt = basePrompt + '\n\n';
  
  if (jobDescription) {
    const jobLabel = isEnglish ? 'JOB DESCRIPTION:' : 'DESCRIPTION DU POSTE:';
    prompt += `${jobLabel}\n${jobDescription}\n\n`;
  }
  
  const resumeLabel = isEnglish ? 'RESUME:' : 'CV:';
  prompt += `${resumeLabel}\n${resumeText}`;
  
  return prompt;
}

/**
 * Get the system prompt based on language
 */
function getSystemPrompt(language: string = 'en'): string {
  if (language === 'fr') {
    return `Vous êtes un expert en recrutement et système de suivi des candidatures (ATS). Analysez le CV fourni comme le ferait à la fois un système ATS analytique et un recruteur humain expérimenté.

Votre analyse doit être subjective et inclure des critiques détaillées en paragraphes pour chaque section du CV. Détectez les compétences manquantes ou sous-représentées par rapport à la description de poste.

Fournissez des optimisations actionnables (formulation, formatage, mots-clés) avec priorisation. Générez également un projet de lettre de motivation adaptée.

Limitez vos remarques à un maximum de 200 mots par section pour éviter la verbosité.

Répondez uniquement avec un objet JSON valide dans ce format exact:
{
  "overallRemark": "Résumé concis de l'adéquation du CV (≤200 mots)",
  "fitScore": 85,
  "skillGaps": ["Gestion de projet", "Cloud Computing"],
  "sections": [
    {
      "title": "EXPÉRIENCE",
      "remark": "Critique détaillée en paragraphe (≤200 mots)",
      "optimizationSuggestions": [
        {"suggestion": "Quantifiez l'impact des projets d'équipe", "priority": "High"},
        {"suggestion": "Utilisez des verbes d'action forts", "priority": "Medium"}
      ],
      "items": [
        {
          "content": "A géré une équipe de 5 ingénieurs pour livrer un produit SaaS",
          "remark": "Bon exemple de leadership, pourrait quantifier l'impact commercial."
        }
      ]
    }
  ],
  "coverLetterDraft": "Madame, Monsieur, Je suis enthousiaste à l'idée de postuler pour..."
}`;
  }

  return `You are an expert recruiter and Applicant Tracking System (ATS) specialist. Analyze the provided resume as both an analytical ATS system and an experienced human recruiter would.

Your analysis should be subjective and include detailed paragraph-length critiques for each resume section. Detect missing or underrepresented skills relative to the job description.

Provide actionable optimizations (phrasing, formatting, keywords) with prioritization. Also generate a tailored cover letter draft.

Constrain your remarks to a maximum of 200 words per section to avoid verbosity.

Respond only with a valid JSON object in this exact format:
{
  "overallRemark": "Concise summary of resume fit (≤200 words)",
  "fitScore": 85,
  "skillGaps": ["Project Management", "Cloud Computing"],
  "sections": [
    {
      "title": "EXPERIENCE",
      "remark": "Paragraph-length critique (≤200 words)",
      "optimizationSuggestions": [
        {"suggestion": "Quantify impact of team projects", "priority": "High"},
        {"suggestion": "Use strong action verbs", "priority": "Medium"}
      ],
      "items": [
        {
          "content": "Managed a team of 5 engineers to deliver SaaS product",
          "remark": "Strong leadership example, could quantify business impact."
        }
      ]
    }
  ],
  "coverLetterDraft": "Dear Hiring Manager, I am excited to apply for..."
}`;
}

/**
 * Validate and sanitize the AI result
 */
function validateAndSanitizeResult(result: any, language: string): AIAnalysisResult {
  // Ensure required fields exist
  const validated: AIAnalysisResult = {
    overallRemark: result.overallRemark || 'Analysis completed.',
    fitScore: Math.max(0, Math.min(100, parseInt(result.fitScore) || 50)),
    skillGaps: Array.isArray(result.skillGaps) ? result.skillGaps.slice(0, 20) : [],
    sections: []
  };

  // Validate sections
  if (Array.isArray(result.sections)) {
    validated.sections = result.sections.slice(0, 10).map((section: any) => ({
      title: String(section.title || 'Section').substring(0, 100),
      remark: String(section.remark || '').substring(0, 500),
      optimizationSuggestions: Array.isArray(section.optimizationSuggestions) 
        ? section.optimizationSuggestions.slice(0, 10).map((suggestion: any) => ({
            suggestion: String(suggestion.suggestion || '').substring(0, 200),
            priority: ['High', 'Medium', 'Low'].includes(suggestion.priority) 
              ? suggestion.priority 
              : 'Medium'
          }))
        : [],
      items: Array.isArray(section.items) 
        ? section.items.slice(0, 20).map((item: any) => ({
            content: String(item.content || '').substring(0, 300),
            remark: String(item.remark || '').substring(0, 200)
          }))
        : undefined
    }));
  }

  // Add cover letter if provided
  if (result.coverLetterDraft && typeof result.coverLetterDraft === 'string') {
    validated.coverLetterDraft = result.coverLetterDraft.substring(0, 2000);
  }

  return validated;
}

/**
 * Generate a simple analysis for non-AI mode (fallback)
 */
export function generateStandardAnalysis(resumeText: string, jobDescription?: string): AIAnalysisResult {
  return {
    overallRemark: jobDescription 
      ? "Standard analysis completed. Consider using AI-powered analysis for detailed insights."
      : "Standard analysis completed without job description.",
    fitScore: 75,
    skillGaps: [],
    sections: [
      {
        title: "OVERALL",
        remark: "Standard analysis provides basic keyword matching and formatting checks. For detailed section-by-section analysis and optimization suggestions, please use AI-powered analysis.",
        optimizationSuggestions: [
          { suggestion: "Consider using AI-powered analysis for detailed feedback", priority: "Medium" }
        ]
      }
    ]
  };
}
