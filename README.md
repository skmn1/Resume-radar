# ResumeRadar

A powerful AI-powered resume analysis application with **RAG (Retrieval-Augmented Generation)** technology that provides comprehensive insights, optimization suggestions, and hallucination-free analysis grounded in actual resume content.

## 🚀 Features

### Core Functionality
- **🔥 RAG-Enhanced AI Analysis**: Zero hallucinations with citation-backed insights
- **AI-Powered Analysis**: Deep resume analysis using Google Gemini 1.5 Flash
- **Multi-Format Support**: PDF and DOCX file parsing
- **Real-time Progress Tracking**: Live progress updates during analysis
- **Comprehensive Scoring**: Detailed scoring across multiple dimensions
- **Multi-language Support**: English and French analysis capabilities
- **Evidence-Based Insights**: Every suggestion backed by actual resume content

### Analysis Types
1. **AI-Powered Analysis with RAG** (Default) ⭐ NEW
   - **RAG Technology**: Retrieval-Augmented Generation eliminates hallucinations
   - **Citation System**: Every insight linked to specific resume sections
   - **Verified Content Only**: Analysis based exclusively on actual resume text
   - Section-by-section critique with detailed feedback
   - Skill gap detection against job descriptions
   - Optimization suggestions with priority levels and evidence
   - Optional cover letter generation
   - Advanced ATS compatibility analysis

2. **Standard Analysis** (Fallback)
   - Keyword matching and density analysis
   - Formatting and readability checks
   - Action verb usage analysis
   - Basic ATS compatibility scoring

### Real-time Progress Indicator
- **Live Updates**: Progress bar with percentage completion
- **Step-by-step Tracking**: Visual indicators for each analysis phase
- **Time Estimation**: Estimated completion time based on current progress
- **Status Updates**: Descriptive messages for current processing step

## 🛠 Technical Architecture

### Backend Infrastructure
- **Framework**: Next.js 15.5.2 with Turbopack
- **Database**: Prisma ORM with SQLite
- **AI Integration**: Dynamic LLM factory pattern supporting multiple providers
- **RAG System**: In-memory vector store with semantic search
- **Embeddings**: Gemini text-embedding-004 with TF-IDF fallback
- **Authentication**: JWT-based with role-based access control
- **Progress Tracking**: In-memory store with polling mechanism

### LLM Integration
- **Primary Provider**: Google Gemini 1.5 Flash
- **Fallback Provider**: OpenAI GPT-4o-mini
- **Dynamic Switching**: Admin-configurable provider selection
- **Metrics Tracking**: Response times and usage statistics
- **Error Handling**: Graceful fallback between providers

### Frontend Features
- **Responsive Design**: Tailwind CSS with dark mode support
- **Real-time Updates**: Progress polling every 2 seconds
- **File Upload**: Drag-and-drop interface with validation
- **Analysis History**: Comprehensive dashboard with filtering
- **Results Visualization**: Rich UI for analysis results

## 📊 Progress Tracking System

### Implementation Details
The progress tracking system provides real-time feedback during the analysis process:

1. **Initialization**: Analysis starts with immediate response containing analysis ID
2. **Background Processing**: Analysis runs asynchronously with progress updates
3. **Live Polling**: Frontend polls `/api/analysis-progress/[id]` every 2 seconds
4. **Progress States**: 
   - `pending`: Analysis queued
   - `processing`: Active analysis with progress 0-100%
   - `completed`: Analysis finished successfully
   - `failed`: Analysis encountered an error

### Progress Steps
1. **File Parsing** (0-20%): PDF/DOCX text extraction
2. **Language Detection** (20-30%): Content language identification
3. **Content Analysis** (30-50%): Structure and formatting analysis
4. **RAG Initialization** (50-60%): Semantic chunking and embedding 🆕
5. **Context Retrieval** (60-70%): Relevant section retrieval 🆕
6. **AI Processing** (70-85%): LLM-powered deep analysis with RAG
7. **Results Compilation** (85-100%): Final scoring and suggestions

## 🧠 RAG System

### How It Works
ResumeRadar uses **Retrieval-Augmented Generation (RAG)** to ensure all AI analysis is grounded in actual resume content:

1. **Semantic Chunking**: Resume is intelligently split into meaningful sections
2. **Vector Embeddings**: Each chunk is converted to embeddings using Gemini
3. **Similarity Search**: Relevant chunks retrieved for each analysis query
4. **Context Injection**: Verified content injected into LLM prompts with citations
5. **Grounded Analysis**: AI can only use information from retrieved chunks

### Key Benefits
- ✅ **Zero Hallucinations**: AI cannot invent information not in resume
- ✅ **Full Traceability**: Every insight linked to specific resume sections
- ✅ **Evidence-Based**: All suggestions backed by actual content
- ✅ **User Trust**: Transparent citations build confidence
- ✅ **Quality Assurance**: Verifiable analysis results

### RAG Configuration
```typescript
// Default RAG settings (optimized for performance)
{
  topK: 5,                    // Retrieve top 5 chunks
  similarityThreshold: 0.65,  // Minimum relevance score
  maxContextLength: 3000,     // Maximum context characters
  reranking: true,            // Re-rank by metadata
  chunkingConfig: {
    maxChunkSize: 500,        // Tokens per chunk
    overlap: 50,              // Token overlap
    respectBoundaries: true,  // Preserve sections
    preserveFormatting: true  // Keep structure
  }
}
```

For detailed RAG documentation, see [docs/RAG_IMPLEMENTATION.md](docs/RAG_IMPLEMENTATION.md)

## 🔧 Setup and Installation

### Prerequisites
- Node.js 18+ and npm
- Google Gemini API key
- Optional: OpenAI API key for fallback

### Environment Configuration
Create a `.env.local` file:
```env
# Required: Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: OpenAI Fallback
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET=your_jwt_secret_here
```

### Installation Steps
```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Initialize LLM providers
node scripts/init-llm-providers.js

# Start development server
npm run dev
```

## 🐛 Bug Fixes and Improvements

### Recently Resolved Issues

#### AI Analysis Bug Resolution
**Problem**: Application was defaulting to standard analysis despite user selecting AI-powered analysis.

**Root Cause Analysis**:
1. Frontend `FileUpload` component was defaulting to `AnalysisType.STANDARD`
2. Dashboard had defensive fallback to `STANDARD` if `analysisType` was undefined
3. No clear visual feedback when AI analysis was actually running

**Solutions Implemented**:
1. **Changed Default Behavior**: FileUpload now defaults to `AnalysisType.AI_POWERED`
2. **Enhanced Frontend Validation**: Dashboard now explicitly sends `AI_POWERED` as default
3. **Progress Feedback**: Real-time progress indicator shows AI processing status
4. **Logging Improvements**: Console logs now clearly show which LLM provider is being used

#### Progress Tracking Implementation
**Enhancement**: Added comprehensive real-time progress tracking system.

**Technical Implementation**:
1. **Backend Progress API**: New `/api/analysis-progress/[id]` endpoint
2. **In-memory Progress Store**: Tracks analysis state and progress percentage
3. **Background Processing**: Analysis runs asynchronously with progress updates
4. **Frontend Polling**: Real-time updates every 2 seconds
5. **Visual Progress Indicator**: Beautiful progress bar with step indicators

## 📝 API Documentation

### Analysis Endpoints

#### POST /api/analyze
Starts a new resume analysis with real-time progress tracking.

**Request**:
```typescript
FormData {
  file: File (PDF/DOCX)
  jobDescription?: string
  analysisType: 'AI_POWERED' | 'STANDARD'
  language?: string
}
```

**Response**:
```json
{
  "success": true,
  "analysis": { "id": "analysis_id" },
  "message": "Analysis started"
}
```

#### GET /api/analysis-progress/[id]
Retrieves real-time progress for an ongoing analysis.

**Response**:
```json
{
  "success": true,
  "progress": {
    "id": "analysis_id",
    "status": "processing",
    "progress": 65,
    "currentStep": "Processing with AI analysis...",
    "estimatedCompletionTime": 1693872000000,
    "steps": [
      { "name": "File parsing", "completed": true },
      { "name": "Language detection", "completed": true },
      { "name": "Content analysis", "completed": true },
      { "name": "AI processing", "completed": false },
      { "name": "Results compilation", "completed": false }
    ]
  }
}
```

## 🔮 Future Enhancements

### Planned Features
- **WebSocket Integration**: Replace polling with real-time WebSocket connections
- **Redis Integration**: Production-ready progress store with persistence
- **Advanced Analytics**: Detailed metrics dashboard for administrators
- **Batch Processing**: Multiple resume analysis with queue management
- **Export Functionality**: PDF report generation with analysis results

### Performance Optimizations
- **Caching Layer**: Redis-based caching for frequently accessed data
- **CDN Integration**: Static asset optimization and delivery
- **Database Optimization**: Query optimization and indexing improvements

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## 📞 Support

For technical support or questions, please open an issue on GitHub or contact our development team.

---

**ResumeRadar** - Transforming resume analysis with AI-powered insights and real-time feedback.
