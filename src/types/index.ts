export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Analysis {
  id: string;
  userId: string;
  filename: string;
  jobDescription?: string;
  overallScore: number;
  keywordScore: number;
  formattingScore: number;
  readabilityScore: number;
  actionVerbScore: number;
  suggestions: Suggestion[];
  keywordsFound: string[];
  keywordsMissing: string[];
  createdAt: Date;
}

export interface Suggestion {
  type: 'keyword' | 'formatting' | 'readability' | 'action_verb';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion: string;
}

export interface AnalysisRequest {
  file: File;
  jobDescription?: string;
}

export interface AnalysisResponse {
  id: string;
  success: boolean;
  message?: string;
  analysis?: Analysis;
}

export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  synonyms?: string[];
  count: number;
}

export interface FormattingIssue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}
