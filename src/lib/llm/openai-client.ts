import OpenAI from 'openai';
import { LLMClient, LLMAnalysisInput, LLMAnalysisResult, LLMUsageMetrics } from './types';

export class OpenAIClient implements LLMClient {
  public readonly name = 'openai';
  public readonly displayName = 'OpenAI GPT-4o-mini';
  private client: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null && !!process.env.OPENAI_API_KEY;
  }

  async analyze(input: LLMAnalysisInput): Promise<{
    result: LLMAnalysisResult;
    metrics: LLMUsageMetrics;
  }> {
    if (!this.client) {
      throw new Error('OpenAI client not configured');
    }

    const startTime = Date.now();
    const prompt = this.createAnalysisPrompt(input.resumeText, input.jobDescription, input.language);

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(input.language)
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

      const responseTime = Date.now() - startTime;
      const result = completion.choices[0]?.message?.content;
      
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const parsedResult = JSON.parse(result) as LLMAnalysisResult;
      const validatedResult = this.validateAndSanitizeResult(parsedResult as unknown as Record<string, unknown>, input.language);

      return {
        result: validatedResult,
        metrics: {
          responseTime,
          tokensUsed: completion.usage?.total_tokens,
        }
      };
    } catch (error) {
      console.error('OpenAI Analysis Error:', error);
      throw new Error(`OpenAI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createAnalysisPrompt(resumeText: string, jobDescription?: string, language: string = 'en'): string {
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

  private getSystemPrompt(language: string = 'en'): string {
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

  private validateAndSanitizeResult(result: Record<string, unknown>, language: string): LLMAnalysisResult {
    // Ensure required fields exist
    const validated: LLMAnalysisResult = {
      overallRemark: String(result.overallRemark || 'Analysis completed.'),
      fitScore: Math.max(0, Math.min(100, parseInt(String(result.fitScore)) || 50)),
      skillGaps: Array.isArray(result.skillGaps) ? result.skillGaps.slice(0, 20) : [],
      sections: []
    };

    // Validate sections
    if (Array.isArray(result.sections)) {
      validated.sections = result.sections.slice(0, 10).map((section: Record<string, unknown>) => ({
        title: String(section.title || 'Section').substring(0, 100),
        remark: String(section.remark || '').substring(0, 500),
        optimizationSuggestions: Array.isArray(section.optimizationSuggestions) 
          ? section.optimizationSuggestions.slice(0, 10).map((suggestion: Record<string, unknown>) => ({
              suggestion: String(suggestion.suggestion || '').substring(0, 200),
              priority: ['High', 'Medium', 'Low'].includes(suggestion.priority as string) 
                ? (suggestion.priority as 'High' | 'Medium' | 'Low')
                : 'Medium'
            }))
          : [],
        items: Array.isArray(section.items) 
          ? section.items.slice(0, 20).map((item: Record<string, unknown>) => ({
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
}
