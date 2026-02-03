/**
 * RAG System Types and Interfaces
 */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface ChunkMetadata {
  sectionTitle?: string;
  sectionType?: ResumeSectionType;
  startIndex: number;
  endIndex: number;
  lineNumber?: number;
  bulletPoint?: boolean;
  hasQuantifiableMetrics?: boolean;
  keywords?: string[];
}

export enum ResumeSectionType {
  HEADER = 'HEADER',
  SUMMARY = 'SUMMARY',
  EXPERIENCE = 'EXPERIENCE',
  EDUCATION = 'EDUCATION',
  SKILLS = 'SKILLS',
  PROJECTS = 'PROJECTS',
  CERTIFICATIONS = 'CERTIFICATIONS',
  AWARDS = 'AWARDS',
  OTHER = 'OTHER'
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  score: number;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RAGContext {
  query: string;
  retrievedChunks: RetrievalResult[];
  contextText: string;
  citations: Citation[];
}

export interface Citation {
  id: string;
  content: string;
  section: string;
  relevanceScore: number;
  lineReference?: string;
}

export interface ChunkingConfig {
  maxChunkSize: number;
  overlap: number;
  respectBoundaries: boolean;
  preserveFormatting: boolean;
}

export interface EmbeddingCache {
  resumeId: string;
  chunks: DocumentChunk[];
  createdAt: number;
  ttl: number; // Time to live in milliseconds
}

export interface RAGConfig {
  topK: number;
  similarityThreshold: number;
  maxContextLength: number;
  reranking: boolean;
  chunkingConfig: ChunkingConfig;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  topK: 5,
  similarityThreshold: 0.45,
  maxContextLength: 3000,
  reranking: true,
  chunkingConfig: {
    maxChunkSize: 500,
    overlap: 50,
    respectBoundaries: true,
    preserveFormatting: true
  }
};
