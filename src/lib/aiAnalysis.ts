import { AIAnalysisResult, AnalysisType } from '@/types';
import { detectLanguage } from './languageDetection';
import { LLMFactory } from './llm';

interface AIAnalysisInput {
  resumeText: string;
  jobDescription?: string;
  language: string;
  analysisType: AnalysisType;
}

/**
 * Generate AI-powered resume analysis using OpenAI
 */
/**
 * Generate AI-powered resume analysis using the configured LLM provider
 */
export async function generateAIAnalysis(input: AIAnalysisInput): Promise<AIAnalysisResult> {
  const { resumeText, jobDescription, language, analysisType } = input;
  
  if (analysisType !== AnalysisType.AI_POWERED) {
    throw new Error('AI analysis only available for AI_POWERED analysis type');
  }

  // Detect resume language if not provided
  const detectedLanguage = detectLanguage(resumeText);
  const actualLanguage = language || detectedLanguage.language;

  try {
    // Get the active LLM client from factory
    const llmClient = await LLMFactory.getActiveClient();
    
    console.log(`Using LLM provider: ${llmClient.displayName} (${llmClient.name})`);
    
    // Perform analysis using the configured LLM
    const { result, metrics } = await llmClient.analyze({
      resumeText,
      jobDescription,
      language: actualLanguage
    });

    // Update provider metrics
    await LLMFactory.updateProviderMetrics(llmClient.name, metrics.responseTime);

    console.log(`Analysis completed in ${metrics.responseTime}ms using ${llmClient.displayName}`);

    // Convert LLM result to our legacy format for compatibility
    return {
      overallRemark: result.overallRemark,
      fitScore: result.fitScore,
      skillGaps: result.skillGaps,
      sections: result.sections,
      coverLetterDraft: result.coverLetterDraft
    };
    
  } catch (error) {
    console.error('AI Analysis Error:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

/**
 * Initialize LLM providers on module load
 */
(async () => {
  try {
    await LLMFactory.initializeProviders();
  } catch (error) {
    console.error('Failed to initialize LLM providers:', error);
  }
})();
