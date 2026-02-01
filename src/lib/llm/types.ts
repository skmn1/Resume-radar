/**
 * LLM Client Types and Interfaces
 */

export interface LLMAnalysisInput {
  resumeText: string;
  jobDescription?: string;
  language: string;
  ragContext?: string;
  citations?: Array<{
    id: string;
    content: string;
    section: string;
  }>;
}

export interface LLMAnalysisResult {
  overallRemark: string;
  fitScore: number;
  skillGaps: string[];
  sections: {
    title: string;
    remark: string;
    optimizationSuggestions: {
      suggestion: string;
      priority: 'High' | 'Medium' | 'Low';
    }[];
    items?: {
      content: string;
      remark: string;
    }[];
  }[];
  coverLetterDraft?: string;
}

export interface LLMUsageMetrics {
  responseTime: number; // in milliseconds
  tokensUsed?: number;
  cost?: number;
}

export interface LLMClient {
  name: string;
  displayName: string;
  analyze(input: LLMAnalysisInput): Promise<{
    result: LLMAnalysisResult;
    metrics: LLMUsageMetrics;
  }>;
  isConfigured(): boolean;
}

export interface LLMProviderConfig {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  isDefault: boolean;
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    [key: string]: unknown;
  };
  apiKeyEnvVar: string;
  totalUsage: number;
  avgResponseTime?: number;
  lastUsedAt?: Date;
}
