export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  language: string;
  isActive: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'USER',
  HR_ADMIN = 'HR_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface Analysis {
  id: string;
  userId: string;
  filename: string;
  jobDescription?: string;
  analysisType: AnalysisType;
  language: string;
  
  // Legacy scoring
  overallScore: number;
  keywordScore: number;
  formattingScore: number;
  readabilityScore: number;
  actionVerbScore: number;
  suggestions: Suggestion[];
  keywordsFound: string[];
  keywordsMissing: string[];
  
  // Enhanced AI analysis
  aiAnalysisResult?: AIAnalysisResult;
  fitScore?: number;
  overallRemark?: string;
  skillGaps?: string[];
  coverLetterDraft?: string;
  
  // Job Matching (NEW)
  jobMatchResult?: any; // JobMatchResult from jobMatching types
  jobMatchScore?: number; // Overall match percentage
  
  // Cover Letter (NEW)
  coverLetter?: any; // CoverLetterResult from jobMatching types
  coverLetterGenerated?: boolean;
  
  // Metadata
  fileSize?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  
  createdAt: Date;
}

export enum AnalysisType {
  STANDARD = 'STANDARD', // Deprecated - kept for database compatibility only
  AI_POWERED = 'AI_POWERED' // Default and only supported type
}

export interface AIAnalysisResult {
  overallRemark: string;
  fitScore: number;
  skillGaps: string[];
  sections: AIAnalysisSection[];
  coverLetterDraft?: string;
  citations?: AnalysisCitation[];
  ragEnabled?: boolean;
}

export interface AnalysisCitation {
  id: string;
  content: string;
  section: string;
  relevanceScore: number;
  lineReference?: string;
}

export interface AIAnalysisSection {
  title: string;
  remark: string;
  optimizationSuggestions: OptimizationSuggestion[];
  items?: AIAnalysisItem[];
  citationIds?: string[];
}

export interface AIAnalysisItem {
  content: string;
  remark: string;
  citationId?: string;
}

export interface OptimizationSuggestion {
  suggestion: string;
  priority: 'High' | 'Medium' | 'Low';
  citationId?: string;
  evidence?: string;
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
  analysisType?: AnalysisType;
  language?: string;
}

export interface AnalysisResponse {
  id: string;
  success: boolean;
  message?: string;
  analysis?: Analysis;
  processingTimeMs?: number;
}

export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
  language?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
  requiresPasswordReset?: boolean;
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  synonyms?: string[];
  count: number;
  context?: string; // RAG-retrieved context showing how/where the keyword is used
}

export interface FormattingIssue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

// Admin panel types
export interface AdminStats {
  totalUsers: number;
  totalAnalyses: number;
  totalErrors: number;
  analysesToday: number;
  usersToday: number;
  mostFrequentSkillGaps: Array<{ skill: string; count: number }>;
  analysisByType: Array<{ type: AnalysisType; count: number }>;
  analysisByLanguage: Array<{ language: string; count: number }>;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Keyword {
  id: string;
  keyword: string;
  category: string;
  weight: number;
  synonyms: string[];
  language: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Language detection and support
export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  isSupported: boolean;
}

// Error handling
export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// Rate limiting
export interface RateLimit {
  limit: number;
  remaining: number;
  resetTime: Date;
}
