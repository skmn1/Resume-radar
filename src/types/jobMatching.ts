/**
 * Job Matching Types and Interfaces
 * Types for dynamic job-resume matching and cover letter generation
 */

export interface JobRequirement {
  id: string;
  category: 'skill' | 'experience' | 'education' | 'certification' | 'soft_skill' | 'language' | 'tool';
  text: string;
  priority: 'required' | 'preferred' | 'nice_to_have';
  foundInResume: boolean;
  resumeEvidence?: string; // Where it was found in resume
  matchScore: number; // 0-1
  sectionReference?: string; // Resume section where found
}

export interface JobMatchResult {
  overallMatch: number; // 0-100
  skillsMatch: number; // 0-100
  experienceMatch: number; // 0-100
  educationMatch: number; // 0-100
  requirements: JobRequirement[];
  strengths: string[]; // What makes candidate strong
  gaps: string[]; // What's missing
  recommendations: string[]; // How to improve application
  jobTitle?: string;
  companyName?: string;
}

export interface CoverLetterRequest {
  resumeText: string;
  jobDescription: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  companyName?: string;
  jobTitle?: string;
  hiringManagerName?: string;
  additionalContext?: string; // User can add specific things to mention
  analysisId?: string; // Optional reference to the analysis
  jobMatchResult?: JobMatchResult; // Optional job match data
}

export interface CoverLetterSection {
  type: 'opening' | 'body' | 'closing';
  content: string;
  highlightedSkills?: string[];
}

export interface CoverLetterResult {
  id: string;
  content: string; // Full letter in HTML format
  sections: CoverLetterSection[];
  wordCount: number;
  highlightedSkills: string[]; // Skills mentioned in letter
  suggestions: string[]; // AI suggestions for improvement
  createdAt: Date;
  updatedAt: Date;
}

export interface CoverLetterExportOptions {
  format: 'pdf' | 'docx' | 'txt' | 'html';
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateAddress?: string;
  companyName?: string;
  companyAddress?: string;
  hiringManagerName?: string;
  includeDate: boolean;
  includeSignature: boolean;
}

export interface ExportMetadata {
  filename: string;
  size: number;
  format: string;
  createdAt: Date;
}
