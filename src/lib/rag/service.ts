/**
 * RAG (Retrieval-Augmented Generation) Orchestrator
 * Main service that coordinates chunking, embedding, retrieval, and context injection
 */

import { ResumeChunker } from './chunker';
import { VectorStore } from './vector-store';
import { RAGContext, RAGConfig, DEFAULT_RAG_CONFIG, Citation, RetrievalResult } from './types';

export class RAGService {
  private chunker: ResumeChunker;
  private vectorStore: VectorStore;
  private config: RAGConfig;
  private isInitialized: boolean = false;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
    this.chunker = new ResumeChunker(this.config.chunkingConfig);
    this.vectorStore = new VectorStore();
  }

  /**
   * Initialize RAG system with resume content
   */
  async initialize(resumeText: string): Promise<void> {
    try {
      // Step 1: Chunk the resume
      const chunks = this.chunker.chunk(resumeText);
      
      if (chunks.length === 0) {
        throw new Error('No chunks generated from resume');
      }

      // Step 2: Add chunks to vector store (embeddings generated internally)
      await this.vectorStore.addChunks(chunks);
      
      this.isInitialized = true;
      console.log(`RAG initialized with ${chunks.length} chunks`);
    } catch (error) {
      console.error('RAG initialization failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieveContext(query: string): Promise<RAGContext> {
    console.log('🔎 [RAGService] retrieveContext called with query:', query);
    
    if (!this.isInitialized) {
      console.error('❌ [RAGService] Service not initialized!');
      throw new Error('RAG service not initialized');
    }

    console.log('✅ [RAGService] Service is initialized, vectorStore size:', this.vectorStore.size());

    try {
      // Step 1: Retrieve relevant chunks
      console.log('📞 [RAGService] Calling vectorStore.retrieve...');
      let results = await this.vectorStore.retrieve(
        query,
        this.config.topK,
        this.config.similarityThreshold
      );
      console.log('📦 [RAGService] VectorStore returned:', results.length, 'results');

      // Step 2: Re-rank if enabled
      if (this.config.reranking && results.length > 0) {
        console.log('🔄 [RAGService] Re-ranking results...');
        results = this.vectorStore.rerank(results, query);
        console.log('📦 [RAGService] After re-ranking:', results.length, 'results');
      }

      // Step 3: Build context and citations
      const { contextText, citations } = this.buildContext(results, query);
      console.log('📝 [RAGService] Built context, text length:', contextText.length, 'citations:', citations.length);

      return {
        query,
        retrievedChunks: results,
        contextText,
        citations
      };
    } catch (error) {
      console.error('💥 [RAGService] Context retrieval failed:', error);
      // Return empty context on error
      return {
        query,
        retrievedChunks: [],
        contextText: '',
        citations: []
      };
    }
  }

  /**
   * Build context string and citations from retrieval results
   */
  private buildContext(results: RetrievalResult[], query: string): { contextText: string; citations: Citation[] } {
    const citations: Citation[] = [];
    let contextText = '';
    let totalLength = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const citationId = `citation_${i + 1}`;
      
      // Check if adding this chunk exceeds max context length
      const chunkText = `[${citationId}] ${result.chunk.content}`;
      if (totalLength + chunkText.length > this.config.maxContextLength && i > 0) {
        break; // Stop adding if we exceed max length
      }

      contextText += chunkText + '\n\n';
      totalLength += chunkText.length;

      citations.push({
        id: citationId,
        content: result.chunk.content,
        section: result.chunk.metadata.sectionTitle || 'Unknown Section',
        relevanceScore: result.score,
        lineReference: this.getLineReference(result.chunk.metadata.startIndex, result.chunk.metadata.endIndex)
      });
    }

    return { contextText: contextText.trim(), citations };
  }

  /**
   * Get line reference for citation
   */
  private getLineReference(startIndex: number, endIndex: number): string {
    return `chars ${startIndex}-${endIndex}`;
  }

  /**
   * Generate augmented prompt with retrieved context
   */
  augmentPrompt(basePrompt: string, context: RAGContext): string {
    if (context.retrievedChunks.length === 0) {
      return basePrompt;
    }

    const contextSection = `
VERIFIED RESUME CONTENT (use ONLY this information):
${context.contextText}

IMPORTANT INSTRUCTIONS:
- Base your analysis ONLY on the verified resume content provided above
- Each piece of information is labeled with a citation (e.g., [citation_1])
- When making observations or suggestions, reference the citation number
- DO NOT invent or hallucinate information not present in the verified content
- If information is not available in the context, explicitly state "Information not found in resume"
- Prioritize content from citations with higher relevance scores
`;

    return contextSection + '\n\n' + basePrompt;
  }

  /**
   * Generate multiple queries for comprehensive retrieval
   */
  generateQueries(analysisType: string, jobDescription?: string): string[] {
    const queries: string[] = [];

    // Base queries for comprehensive analysis
    queries.push('Professional experience and work history');
    queries.push('Technical skills and competencies');
    queries.push('Education and academic qualifications');
    queries.push('Notable achievements and accomplishments');

    // Add job-specific queries if available
    if (jobDescription) {
      const jobKeywords = this.extractJobKeywords(jobDescription);
      queries.push(`Skills and experience related to: ${jobKeywords.slice(0, 5).join(', ')}`);
    }

    return queries;
  }

  /**
   * Extract key terms from job description
   */
  private extractJobKeywords(jobDescription: string): string[] {
    const text = jobDescription.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    
    // Count word frequency
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Filter out common words and sort by frequency
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'will', 'are', 'have']);
    const keywords = Object.entries(wordCount)
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 10);

    return keywords;
  }

  /**
   * Retrieve context for multiple queries and merge results
   */
  async retrieveMultiQueryContext(queries: string[]): Promise<RAGContext> {
    const allResults: Map<string, RetrievalResult> = new Map();

    for (const query of queries) {
      const context = await this.retrieveContext(query);
      
      // Merge results, keeping highest score for duplicates
      for (const result of context.retrievedChunks) {
        const existing = allResults.get(result.chunk.id);
        if (!existing || result.score > existing.score) {
          allResults.set(result.chunk.id, result);
        }
      }
    }

    // Convert map to array and sort by score
    const mergedResults = Array.from(allResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK);

    // Build final context
    const { contextText, citations } = this.buildContext(mergedResults, queries.join('; '));

    return {
      query: queries.join('; '),
      retrievedChunks: mergedResults,
      contextText,
      citations
    };
  }

  /**
   * Check if RAG is ready to use
   */
  isReady(): boolean {
    return this.isInitialized && this.vectorStore.size() > 0;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.chunker.dispose();
    this.vectorStore.clear();
    this.isInitialized = false;
  }

  /**
   * Get statistics about the current RAG state
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      chunksStored: this.vectorStore.size(),
      config: this.config
    };
  }
}

/**
 * Factory function to create RAG service
 */
export function createRAGService(config?: Partial<RAGConfig>): RAGService {
  return new RAGService(config);
}
