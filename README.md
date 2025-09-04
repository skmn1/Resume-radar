# ResumeRadar

A powerful AI-powered resume analysis application that provides comprehensive insights, optimization suggestions, and real-time progress tracking.

## 🚀 Features

### Core Functionality
- **AI-Powered Analysis**: Deep resume analysis using Google Gemini 1.5 Flash
- **Multi-Format Support**: PDF and DOCX file parsing
- **Real-time Progress Tracking**: Live progress updates during analysis
- **Comprehensive Scoring**: Detailed scoring across multiple dimensions
- **Multi-language Support**: English and French analysis capabilities

### Analysis Types
1. **AI-Powered Analysis** (Default)
   - Section-by-section critique with detailed feedback
   - Skill gap detection against job descriptions
   - Optimization suggestions with priority levels
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
4. **AI Processing** (50-80%): LLM-powered deep analysis
5. **Results Compilation** (80-100%): Final scoring and suggestions

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
