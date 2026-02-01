/**
 * Semantic Resume Chunker
 * Intelligently splits resume into meaningful chunks while preserving context
 */

import { DocumentChunk, ChunkMetadata, ChunkingConfig, ResumeSectionType, DEFAULT_RAG_CONFIG } from './types';
import { encodingForModel } from 'js-tiktoken';

export class ResumeChunker {
  private config: ChunkingConfig;
  private tokenizer;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG.chunkingConfig, ...config };
    // Use GPT-4 tokenizer as a standard
    this.tokenizer = encodingForModel('gpt-4');
  }

  /**
   * Chunk resume text into semantic sections
   */
  chunk(resumeText: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Step 1: Detect and split by sections
    const sections = this.detectSections(resumeText);
    
    // Step 2: Process each section
    let chunkId = 0;
    for (const section of sections) {
      const sectionChunks = this.chunkSection(section, chunkId);
      chunks.push(...sectionChunks);
      chunkId += sectionChunks.length;
    }

    return chunks;
  }

  /**
   * Detect resume sections based on common headers
   */
  private detectSections(text: string): Array<{ type: ResumeSectionType; title: string; content: string; startIndex: number }> {
    const sections: Array<{ type: ResumeSectionType; title: string; content: string; startIndex: number }> = [];
    const lines = text.split('\n');
    
    const sectionPatterns = [
      { type: ResumeSectionType.SUMMARY, patterns: /^(summary|profile|objective|about|professional summary)/i },
      { type: ResumeSectionType.EXPERIENCE, patterns: /^(experience|work experience|employment|work history|professional experience)/i },
      { type: ResumeSectionType.EDUCATION, patterns: /^(education|academic|qualifications)/i },
      { type: ResumeSectionType.SKILLS, patterns: /^(skills|technical skills|core competencies|expertise)/i },
      { type: ResumeSectionType.PROJECTS, patterns: /^(projects|portfolio)/i },
      { type: ResumeSectionType.CERTIFICATIONS, patterns: /^(certifications|certificates|licenses)/i },
      { type: ResumeSectionType.AWARDS, patterns: /^(awards|honors|achievements|recognition)/i },
    ];

    let currentSection: { type: ResumeSectionType; title: string; content: string; startIndex: number } | null = null;
    let currentIndex = 0;
    
    // First, detect header (first 5 lines typically)
    let headerContent = '';
    let i = 0;
    for (; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 0) {
        headerContent += line + '\n';
      }
      currentIndex += lines[i].length + 1;
    }
    
    if (headerContent.trim()) {
      sections.push({
        type: ResumeSectionType.HEADER,
        title: 'Header',
        content: headerContent.trim(),
        startIndex: 0
      });
    }

    // Process remaining lines
    for (; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.length === 0) {
        if (currentSection) {
          currentSection.content += '\n';
        }
        currentIndex += 1;
        continue;
      }

      // Check if this line is a section header
      let isSectionHeader = false;
      for (const pattern of sectionPatterns) {
        if (pattern.patterns.test(line)) {
          // Save previous section
          if (currentSection && currentSection.content.trim()) {
            sections.push(currentSection);
          }
          
          // Start new section
          currentSection = {
            type: pattern.type,
            title: line,
            content: '',
            startIndex: currentIndex
          };
          isSectionHeader = true;
          break;
        }
      }

      if (!isSectionHeader) {
        if (!currentSection) {
          // If no section detected yet, treat as OTHER
          currentSection = {
            type: ResumeSectionType.OTHER,
            title: 'Other',
            content: '',
            startIndex: currentIndex
          };
        }
        currentSection.content += line + '\n';
      }
      
      currentIndex += lines[i].length + 1;
    }

    // Add last section
    if (currentSection && currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Chunk a single section into smaller pieces if needed
   */
  private chunkSection(
    section: { type: ResumeSectionType; title: string; content: string; startIndex: number },
    startChunkId: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = section.content.trim();
    
    if (!content) {
      return chunks;
    }

    // For small sections, keep as one chunk
    const tokens = this.tokenizer.encode(content);
    if (tokens.length <= this.config.maxChunkSize) {
      chunks.push(this.createChunk(
        startChunkId,
        content,
        section.type,
        section.title,
        section.startIndex,
        section.startIndex + content.length
      ));
      return chunks;
    }

    // For larger sections, use sliding window with overlap
    const sentences = this.splitIntoSentences(content);
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;
    let chunkStartIndex = section.startIndex;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.tokenizer.encode(sentence);
      
      if (currentTokens + sentenceTokens.length > this.config.maxChunkSize && currentChunk) {
        // Save current chunk
        chunks.push(this.createChunk(
          startChunkId + chunkIndex,
          currentChunk.trim(),
          section.type,
          section.title,
          chunkStartIndex,
          chunkStartIndex + currentChunk.length
        ));
        chunkIndex++;
        
        // Start new chunk with overlap
        if (this.config.overlap > 0 && i > 0) {
          // Include last sentence from previous chunk for context
          currentChunk = sentences[i - 1] + ' ' + sentence;
          currentTokens = this.tokenizer.encode(currentChunk).length;
        } else {
          currentChunk = sentence;
          currentTokens = sentenceTokens.length;
        }
        chunkStartIndex = section.startIndex + content.indexOf(sentence);
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentTokens += sentenceTokens.length;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        startChunkId + chunkIndex,
        currentChunk.trim(),
        section.type,
        section.title,
        chunkStartIndex,
        section.startIndex + section.content.length
      ));
    }

    return chunks;
  }

  /**
   * Create a document chunk with metadata
   */
  private createChunk(
    id: number,
    content: string,
    sectionType: ResumeSectionType,
    sectionTitle: string,
    startIndex: number,
    endIndex: number
  ): DocumentChunk {
    const metadata: ChunkMetadata = {
      sectionType,
      sectionTitle,
      startIndex,
      endIndex,
      bulletPoint: this.isBulletPoint(content),
      hasQuantifiableMetrics: this.hasMetrics(content),
      keywords: this.extractKeywords(content)
    };

    return {
      id: `chunk_${id}`,
      content: content.trim(),
      metadata
    };
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be improved with NLP)
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0);
  }

  /**
   * Check if content is a bullet point
   */
  private isBulletPoint(content: string): boolean {
    return /^[\-•*]\s/.test(content.trim()) || /^\d+\.\s/.test(content.trim());
  }

  /**
   * Check if content has quantifiable metrics
   */
  private hasMetrics(content: string): boolean {
    return /\d+\s*(%|percent|thousand|million|billion|users|customers|revenue|\$)/.test(content);
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    const words = content.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const uniqueWords = [...new Set(words)];
    
    // Filter out common words
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'has', 'had', 'was', 'were', 'been', 'are']);
    return uniqueWords.filter(w => !stopWords.has(w)).slice(0, 10);
  }

  /**
   * Clean up
   */
  dispose() {
    this.tokenizer.free();
  }
}
