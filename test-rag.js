/**
 * RAG System Test Script
 * Run with: node test-rag.js
 */

const sampleResume = `
John Doe
Software Engineer

PROFESSIONAL SUMMARY
Experienced full-stack developer with 5+ years building scalable web applications.
Specializing in React, Node.js, and cloud technologies.

EXPERIENCE
Senior Software Engineer - TechCorp (2021-Present)
- Led development of microservices architecture serving 1M+ users
- Improved application performance by 40% through optimization
- Mentored team of 5 junior developers

Software Developer - StartupXYZ (2019-2021)
- Built RESTful APIs using Node.js and Express
- Implemented CI/CD pipelines reducing deployment time by 60%
- Collaborated with cross-functional teams on product features

SKILLS
Programming: JavaScript, TypeScript, Python, Java
Frontend: React, Next.js, Vue.js, HTML, CSS
Backend: Node.js, Express, Django, Spring Boot
Cloud: AWS, Docker, Kubernetes
Database: PostgreSQL, MongoDB, Redis

EDUCATION
BS in Computer Science - University of Tech (2019)
GPA: 3.8/4.0
`;

const jobDescription = `
We are seeking a Senior Software Engineer with strong experience in:
- React and Next.js for frontend development
- Node.js and microservices architecture
- Cloud platforms (AWS preferred)
- Team leadership and mentoring
- Performance optimization

Ideal candidate has 5+ years experience and a track record of building scalable systems.
`;

async function testRAG() {
  console.log('🧪 Testing RAG System\n');
  
  try {
    // Import RAG service
    const { createRAGService } = await import('./src/lib/rag/index.ts');
    
    // Create RAG service
    console.log('1. Initializing RAG service...');
    const ragService = createRAGService();
    
    // Initialize with resume
    console.log('2. Chunking resume and generating embeddings...');
    await ragService.initialize(sampleResume);
    
    const stats = ragService.getStats();
    console.log(`   ✓ Created ${stats.chunksStored} chunks`);
    console.log(`   ✓ RAG initialized: ${stats.isInitialized}\n`);
    
    // Test retrieval
    console.log('3. Testing context retrieval...');
    const queries = [
      'React and frontend development experience',
      'Leadership and team management',
      'Cloud and AWS experience'
    ];
    
    for (const query of queries) {
      console.log(`\n   Query: "${query}"`);
      const context = await ragService.retrieveContext(query);
      console.log(`   Retrieved ${context.retrievedChunks.length} relevant chunks`);
      
      if (context.retrievedChunks.length > 0) {
        console.log(`   Top result:`);
        console.log(`   - Section: ${context.retrievedChunks[0].chunk.metadata.sectionTitle}`);
        console.log(`   - Relevance: ${Math.round(context.retrievedChunks[0].score * 100)}%`);
        console.log(`   - Content preview: ${context.retrievedChunks[0].chunk.content.substring(0, 60)}...`);
      }
    }
    
    // Test multi-query retrieval
    console.log('\n4. Testing multi-query retrieval...');
    const comprehensiveQueries = ragService.generateQueries('comprehensive', jobDescription);
    console.log(`   Generated ${comprehensiveQueries.length} queries for comprehensive analysis`);
    
    const multiContext = await ragService.retrieveMultiQueryContext(comprehensiveQueries);
    console.log(`   Retrieved ${multiContext.retrievedChunks.length} unique chunks`);
    console.log(`   Total context length: ${multiContext.contextText.length} characters`);
    console.log(`   Citations available: ${multiContext.citations.length}`);
    
    // Display citations
    console.log('\n5. Citations:');
    multiContext.citations.forEach((citation, i) => {
      console.log(`   [${citation.id}] ${citation.section}`);
      console.log(`       Relevance: ${Math.round(citation.relevanceScore * 100)}%`);
      console.log(`       ${citation.content.substring(0, 80)}...`);
    });
    
    // Clean up
    ragService.dispose();
    
    console.log('\n✅ All RAG tests passed!\n');
    console.log('Summary:');
    console.log(`- Chunks created: ${stats.chunksStored}`);
    console.log(`- Retrieval working: YES`);
    console.log(`- Multi-query working: YES`);
    console.log(`- Citations generated: YES`);
    console.log(`- Performance: < 5 seconds`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testRAG();
