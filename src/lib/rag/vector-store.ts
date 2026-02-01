/**
 * Vector Store for Resume Embeddings
 * In-memory vector store with similarity search capabilities
 */

import { DocumentChunk, RetrievalResult } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class VectorStore {
  private chunks: Map<string, DocumentChunk> = new Map();
  private geminiClient: GoogleGenerativeAI | null = null;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    // Initialize Gemini for embeddings
    if (process.env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Add chunks to the vector store with embeddings
   */
  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      // Generate embedding if not present
      if (!chunk.embedding) {
        chunk.embedding = await this.generateEmbedding(chunk.content);
      }
      this.chunks.set(chunk.id, chunk);
    }
  }

  /**
   * Generate embedding for text using Gemini
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.hashText(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    if (!this.geminiClient) {
      // Fallback: simple TF-IDF-like embedding
      return this.generateSimpleEmbedding(text);
    }

    try {
      const model = this.geminiClient.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;
      
      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      // Fallback to simple embedding
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Simple hash function for text
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Fallback: Generate simple TF-IDF-like embedding
   */
  private generateSimpleEmbedding(text: string, dimensions: number = 768): number[] {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const embedding = new Array(dimensions).fill(0);
    
    // Simple word-based embedding
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length && j < dimensions; j++) {
        const charCode = word.charCodeAt(j);
        embedding[(i * 31 + charCode) % dimensions] += 1;
      }
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  /**
   * Retrieve relevant chunks based on query
   */
  async retrieve(query: string, topK: number = 5, threshold: number = 0.65): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results: RetrievalResult[] = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      if (similarity >= threshold) {
        results.push({
          chunk,
          score: similarity,
          relevance: this.getRelevanceLevel(similarity)
        });
      }
    }

    // Sort by score descending and take top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Determine relevance level based on similarity score
   */
  private getRelevanceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score >= 0.85) return 'HIGH';
    if (score >= 0.7) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Clear the vector store
   */
  clear(): void {
    this.chunks.clear();
    this.embeddingCache.clear();
  }

  /**
   * Get total number of chunks stored
   */
  size(): number {
    return this.chunks.size;
  }

  /**
   * Re-rank results using additional signals
   */
  rerank(results: RetrievalResult[], query: string): RetrievalResult[] {
    return results.map(result => {
      let boostedScore = result.score;
      
      // Boost based on metadata
      if (result.chunk.metadata.hasQuantifiableMetrics) {
        boostedScore *= 1.1;
      }
      
      // Boost if section type matches query intent
      const queryLower = query.toLowerCase();
      if (queryLower.includes('skill') && result.chunk.metadata.sectionType === 'SKILLS') {
        boostedScore *= 1.15;
      }
      if (queryLower.includes('experience') && result.chunk.metadata.sectionType === 'EXPERIENCE') {
        boostedScore *= 1.15;
      }
      if (queryLower.includes('education') && result.chunk.metadata.sectionType === 'EDUCATION') {
        boostedScore *= 1.15;
      }
      
      // Keyword matching boost
      const queryWords = new Set(queryLower.split(/\s+/));
      const matchingKeywords = result.chunk.metadata.keywords?.filter(kw => 
        queryWords.has(kw.toLowerCase())
      ).length || 0;
      
      if (matchingKeywords > 0) {
        boostedScore *= (1 + matchingKeywords * 0.05);
      }

      return {
        ...result,
        score: Math.min(boostedScore, 1.0) // Cap at 1.0
      };
    }).sort((a, b) => b.score - a.score);
  }
}
