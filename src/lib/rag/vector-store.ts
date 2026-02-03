/**
 * Vector Store for Resume Embeddings
 * In-memory vector store with similarity search capabilities
 */

import { DocumentChunk, RetrievalResult } from './types';
import { GoogleGenAI } from '@google/genai';

export class VectorStore {
  private chunks: Map<string, DocumentChunk> = new Map();
  private geminiClient: GoogleGenAI | null = null;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });
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
      console.log('🔄 [VectorStore] Using cached embedding');
      return this.embeddingCache.get(cacheKey)!;
    }

    if (!this.geminiClient) {
      console.log('⚠️ [VectorStore] No Gemini client, using fallback embedding');
      return this.generateSimpleEmbedding(text);
    }

    try {
      console.log('🧮 [VectorStore] Generating Gemini embedding for text:', text.substring(0, 100) + '...');
      
      const result = await this.geminiClient.models.embedContent({
        model: 'text-embedding-004',
        contents: [
          { parts: [{ text: text }] }
        ]
      });
      
      if (!result.embeddings || result.embeddings.length === 0 || !result.embeddings[0].values) {
        console.error('❌ [VectorStore] No embeddings returned, using fallback');
        return this.generateSimpleEmbedding(text);
      }

      const embedding = result.embeddings[0].values;
      console.log('✅ [VectorStore] Gemini embedding generated, length:', embedding.length);
      
      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.error('❌ [VectorStore] Embedding generation error:', error);
      console.log('⚠️ [VectorStore] Falling back to simple embedding');
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
    console.log('🔍 [VectorStore] Starting retrieval for query:', query.substring(0, 100));
    console.log('📊 [VectorStore] Total chunks in store:', this.chunks.size);
    console.log('📊 [VectorStore] Threshold:', threshold, 'TopK:', topK);
    
    const queryEmbedding = await this.generateEmbedding(query);
    console.log('🧮 [VectorStore] Query embedding length:', queryEmbedding.length);
    
    const results: RetrievalResult[] = [];
    let maxSimilarity = 0;
    let minSimilarity = 1;

    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding) {
        console.warn('⚠️ [VectorStore] Chunk has no embedding:', chunk.id);
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      maxSimilarity = Math.max(maxSimilarity, similarity);
      minSimilarity = Math.min(minSimilarity, similarity);
      
      console.log('📊 [VectorStore] Chunk', chunk.id, 'similarity:', similarity.toFixed(3), 'section:', chunk.metadata.sectionType);
      
      if (similarity >= threshold) {
        console.log('✅ [VectorStore] Chunk PASSED threshold!');
        results.push({
          chunk,
          score: similarity,
          relevance: this.getRelevanceLevel(similarity)
        });
      } else {
        console.log('❌ [VectorStore] Chunk FAILED threshold (', similarity.toFixed(3), '<', threshold, ')');
      }
    }

    console.log('📊 [VectorStore] Similarity range:', minSimilarity.toFixed(3), 'to', maxSimilarity.toFixed(3));
    console.log('📦 [VectorStore] Results before sort:', results.length);

    // Sort by score descending and take top K
    results.sort((a, b) => b.score - a.score);
    const finalResults = results.slice(0, topK);
    
    console.log('📦 [VectorStore] Final results after topK:', finalResults.length);
    if (finalResults.length > 0) {
      console.log('✅ [VectorStore] Top result score:', finalResults[0].score.toFixed(3));
    }
    
    return finalResults;
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