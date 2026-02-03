import { GoogleGenAI } from '@google/genai';
import { LLMClient, LLMAnalysisInput, LLMAnalysisResult, LLMUsageMetrics } from './types';

export class GeminiClient implements LLMClient {
  public readonly name = 'gemini';
  public readonly displayName = 'Google Gemini 3 Flash Preview';
  private client: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null && !!process.env.GEMINI_API_KEY;
  }

  async analyze(input: LLMAnalysisInput): Promise<{
    result: LLMAnalysisResult;
    metrics: LLMUsageMetrics;
  }> {
    if (!this.client) {
      throw new Error('Gemini client not configured');
    }

    const startTime = Date.now();

    const prompt = this.createAnalysisPrompt(
      input.resumeText, 
      input.jobDescription, 
      input.language,
      input.ragContext,
      input.citations
    );
    const systemPrompt = this.getSystemPrompt(input.language, !!input.ragContext);
    
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: fullPrompt,
      });
      const responseTime = Date.now() - startTime;
      
      const text = response.text;
      
      if (!text) {
        throw new Error('No response from Gemini');
      }

      // Clean up the response to extract JSON
      let jsonText = text.trim();
      
      // Remove code block markers if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      
      // Find JSON object
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonText = jsonText.slice(jsonStart, jsonEnd + 1);
      }

      const parsedResult = JSON.parse(jsonText) as LLMAnalysisResult;
      const validatedResult = this.validateAndSanitizeResult(parsedResult as unknown as Record<string, unknown>, input.language);

      return {
        result: validatedResult,
        metrics: {
          responseTime
        }
      };
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      throw new Error(`Gemini analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createAnalysisPrompt(
    resumeText: string, 
    jobDescription?: string, 
    language: string = 'en',
    ragContext?: string,
    citations?: Array<{ id: string; content: string; section: string }>
  ): string {
    const isEnglish = language === 'en';
    
    let prompt = '';
    
    // Add RAG context if available
    if (ragContext && citations) {
      const contextLabel = isEnglish ? 'VERIFIED RESUME CONTENT (use ONLY this information):' : 'CONTENU VÉRIFIÉ DU CV (utilisez UNIQUEMENT ces informations):';
      prompt += `${contextLabel}\n${ragContext}\n\n`;
      
      const instructionsLabel = isEnglish ? 'ANALYSIS INSTRUCTIONS:' : 'INSTRUCTIONS D\'ANALYSE:';
      const instructions = isEnglish 
        ? `- Base your analysis EXCLUSIVELY on the verified resume content above
- Each piece of information is labeled with a citation (e.g., [citation_1])
- Reference citation numbers when making observations or suggestions
- DO NOT invent information not present in the verified content
- If information is unavailable in the context, state "Information not found in resume"
- Prioritize content from citations with higher relevance\n\n`
        : `- Basez votre analyse EXCLUSIVEMENT sur le contenu vérifié du CV ci-dessus
- Chaque information est étiquetée avec une citation (par ex., [citation_1])
- Référencez les numéros de citation lors de vos observations ou suggestions
- N'inventez PAS d'informations absentes du contenu vérifié
- Si l'information n'est pas disponible dans le contexte, indiquez "Information non trouvée dans le CV"
- Priorisez le contenu des citations ayant une pertinence élevée\n\n`;
      
      prompt += `${instructionsLabel}\n${instructions}`;
    }
    
    const basePrompt = isEnglish 
      ? `Analyze the following resume${jobDescription ? ' against this job description' : ''}:`
      : `Analysez le CV suivant${jobDescription ? ' par rapport à cette description de poste' : ''}:`;

    prompt += basePrompt + '\n\n';
    
    if (jobDescription) {
      const jobLabel = isEnglish ? 'JOB DESCRIPTION:' : 'DESCRIPTION DU POSTE:';
      prompt += `${jobLabel}\n${jobDescription}\n\n`;
    }
    
    // Only include full resume if no RAG context
    if (!ragContext) {
      const resumeLabel = isEnglish ? 'RESUME:' : 'CV:';
      prompt += `${resumeLabel}\n${resumeText}`;
    }
    
    return prompt;
  }

  private getSystemPrompt(language: string = 'en', ragEnabled: boolean = false): string {
    const ragInstructions = ragEnabled 
      ? `\n\nIMPORTANT: You will be provided with VERIFIED RESUME CONTENT with citations. Use ONLY this verified content for your analysis. Do not make assumptions or add information not present in the citations. Always reference citation IDs (e.g., [citation_1]) in your remarks and suggestions.`
      : '';
      
    if (language === 'fr') {
      const ragInstructionsFr = ragEnabled
        ? `\n\nIMPORTANT: Vous recevrez du CONTENU VÉRIFIÉ DU CV avec des citations. Utilisez UNIQUEMENT ce contenu vérifié pour votre analyse. Ne faites pas d'hypothèses et n'ajoutez pas d'informations absentes des citations. Référencez toujours les identifiants de citation (par ex., [citation_1]) dans vos remarques et suggestions.`
        : '';
        
      return `Vous êtes un expert en recrutement et système de suivi des candidatures (ATS). Analysez le CV fourni comme le ferait à la fois un système ATS analytique et un recruteur humain expérimenté.

Votre analyse doit être subjective et inclure des critiques détaillées en paragraphes pour chaque section du CV. Détectez les compétences manquantes ou sous-représentées par rapport à la description de poste.

Fournissez des optimisations actionnables (formulation, formatage, mots-clés) avec priorisation. Générez également un projet de lettre de motivation adaptée.

Limitez vos remarques à un maximum de 200 mots par section pour éviter la verbosité.${ragInstructionsFr}

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

Constrain your remarks to a maximum of 200 words per section to avoid verbosity.${ragInstructions}

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
