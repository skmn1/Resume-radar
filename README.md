# ResumeRadar - The Ultimate ATS Resume Checker

![ResumeRadar Logo](https://via.placeholder.com/150x50/3B82F6/FFFFFF?text=ResumeRadar)

ResumeRadar is a sophisticated web application that helps job seekers optimize their resumes for Applicant Tracking Systems (ATS). Built with Next.js, TypeScript, and Tailwind CSS, it provides intelligent analysis, keyword optimization, and actionable feedback to improve resume performance.

## 🌟 Features

- **🎯 ATS Optimization**: Comprehensive compatibility analysis with detailed scoring
- **📊 Interactive Analysis**: Real-time resume scoring with breakdown by category
- **🔍 Job-Targeted Keywords**: Upload job descriptions for targeted keyword analysis
- **💡 Actionable Insights**: Specific, step-by-step improvement recommendations
- **📱 Responsive Design**: Beautiful, modern interface that works on all devices
- **🔐 Secure Authentication**: User accounts with secure password hashing
- **📈 Analysis History**: Track your resume improvements over time
- **⚡ Fast & Reliable**: Built with modern web technologies for optimal performance

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/resume-radar.git
   cd resume-radar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   JWT_SECRET="your-jwt-secret-change-this-in-production"
   NODE_ENV="development"
   ```

4. **Initialize the database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture & Components

### Tech Stack

- **Frontend**: Next.js 15.5.2, React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: SQLite with Prisma ORM
- **Authentication**: Custom JWT-based authentication
- **File Processing**: PDF-parse, Mammoth (DOCX)
- **Testing**: Cypress for E2E testing
- **Deployment**: Docker & Docker Compose

### Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── analyze/       # Resume analysis endpoint
│   │   └── analyses/      # Analysis history endpoints
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── results/           # Analysis results page
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
│   ├── AuthProvider.tsx   # Authentication context
│   ├── FileUpload.tsx     # Drag & drop file upload
│   ├── Header.tsx         # Navigation header
│   └── ui.tsx            # UI component library
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication utilities
│   ├── prisma.ts         # Database client
│   └── resumeAnalysis.ts # Core analysis logic
└── types/                # TypeScript type definitions
```

### Core Components

- **AuthProvider**: Manages user authentication state and API calls
- **FileUpload**: Drag-and-drop interface with file validation
- **Header**: Responsive navigation with user menu
- **UI Components**: Reusable design system components

### API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/analyze` - Resume analysis
- `GET /api/analyses` - Get user's analysis history
- `GET /api/analyses/[id]` - Get specific analysis details

## 🧠 Business Logic

### Resume Analysis Algorithm

The core analysis engine processes resumes through multiple scoring dimensions:

#### 1. Keyword Analysis (40% of overall score)
- **Target Keywords**: Extracted from job descriptions or default tech keywords
- **Synonym Matching**: Recognizes variations and acronyms (JS → JavaScript)
- **Context Analysis**: Considers keyword frequency and placement
- **Missing Keywords**: Identifies opportunities for improvement

#### 2. Formatting Analysis (30% of overall score)
- **ATS Compatibility**: Detects problematic formatting elements
- **Table Detection**: Identifies complex layouts that ATS may struggle with
- **Special Characters**: Flags excessive use of symbols
- **Graphics Detection**: Warns about images and charts

#### 3. Readability Analysis (20% of overall score)
- **Flesch Reading Ease**: Calculates text complexity
- **Sentence Structure**: Analyzes average sentence length
- **Professional Clarity**: Ensures appropriate complexity for professional documents

#### 4. Action Verb Analysis (10% of overall score)
- **Strong Verbs**: Identifies impactful action words
- **Bullet Point Structure**: Analyzes achievement formatting
- **Professional Language**: Encourages active voice usage

### Scoring System

```
Overall Score = (Keyword Score × 0.4) + 
                (Formatting Score × 0.3) + 
                (Readability Score × 0.2) + 
                (Action Verb Score × 0.1)
```

**Score Interpretation:**
- 🟢 80-100%: Excellent ATS optimization
- 🟡 60-79%: Good with room for improvement
- 🔴 0-59%: Needs significant optimization

## 🧪 Testing

### Cypress E2E Test Suite

Our comprehensive test suite covers:

#### Test Scenarios

1. **Landing Page Tests** (`cypress/e2e/landing.cy.ts`)
   - Page load and content verification
   - Navigation functionality
   - Responsive design elements

2. **Authentication Flow** (`cypress/e2e/auth.cy.ts`)
   - User registration with validation
   - Login with error handling
   - Session management
   - Protected route access

3. **Dashboard Functionality** (`cypress/e2e/dashboard.cy.ts`)
   - File upload interface
   - Job description input
   - Analysis history display
   - User session persistence

### Running Tests

```bash
# Run all tests in headless mode
npm test

# Open Cypress test runner
npm run test:open

# Run specific test file
npx cypress run --spec "cypress/e2e/auth.cy.ts"
```

### Test Commands

Custom Cypress commands for testing:

```typescript
// Login user
cy.login('user@example.com', 'password');

// Register new user
cy.register('user@example.com', 'password', 'Full Name');
```

## 🚀 Deployment Guide

### Docker Deployment

#### 1. Build the Docker Image

```bash
# Build the production image
docker build -t resume-radar .

# Or build with docker-compose
docker-compose build
```

#### 2. Run with Docker Compose

```bash
# Start the application
docker-compose up -d

# Check logs
docker-compose logs -f web

# Stop the application
docker-compose down
```

#### 3. Environment Configuration

Create a production `.env` file:

```env
NODE_ENV=production
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=https://your-domain.com
JWT_SECRET=your-jwt-secret-key
```

### AWS EC2 Deployment

#### 1. Launch EC2 Instance

```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu
```

#### 2. Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/resume-radar.git
cd resume-radar

# Set up environment
cp .env.example .env
# Edit .env with production values

# Build and start
docker-compose up -d
```

#### 3. Set up Reverse Proxy (Optional)

```nginx
# /etc/nginx/sites-available/resume-radar
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Hub Deployment

#### 1. Build and Tag Image

```bash
# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t yourusername/resume-radar:latest .

# Tag for Docker Hub
docker tag resume-radar yourusername/resume-radar:latest
```

#### 2. Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Push image
docker push yourusername/resume-radar:latest
```

#### 3. Deploy from Docker Hub

```bash
# Pull and run on production server
docker pull yourusername/resume-radar:latest
docker run -d -p 3000:3000 --env-file .env yourusername/resume-radar:latest
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Cypress tests
npm run test:open    # Open Cypress test runner
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run database migrations
```

### Code Quality

The project follows these standards:

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with Next.js rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages

### Development Workflow

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes with proper TypeScript types
3. Write tests for new functionality
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'feat: add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Contribution Guidelines

1. **Code Style**: Follow existing TypeScript and React patterns
2. **Testing**: Add tests for new features
3. **Documentation**: Update README and JSDoc comments
4. **Commit Messages**: Use conventional commit format

### Reporting Issues

Please use our [Issue Template](.github/ISSUE_TEMPLATE.md) when reporting bugs or requesting features.

## 🔒 Security & Privacy

### Data Handling

- **File Processing**: Resume files are processed in memory and not stored permanently
- **User Data**: Minimal user data collection (email, name, analysis history)
- **Password Security**: Bcrypt hashing with salt rounds
- **JWT Tokens**: Secure token-based authentication

### Security Measures

- Input validation and sanitization
- SQL injection prevention with Prisma
- XSS protection with Content Security Policy
- Rate limiting on API endpoints
- Secure file upload validation

### Privacy Policy

ResumeRadar is committed to protecting user privacy:

- Resume content is processed locally and not shared with third parties
- Analysis results are stored securely and associated only with user accounts
- Users can delete their data at any time
- No tracking or analytics beyond basic usage metrics

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Prisma](https://www.prisma.io/) - Next-generation Node.js and TypeScript ORM
- [Cypress](https://www.cypress.io/) - JavaScript End-to-End Testing Framework
- [React Dropzone](https://react-dropzone.js.org/) - Simple HTML5 drag-drop zone

## 📞 Support

- **Documentation**: [docs.resumeradar.com](https://docs.resumeradar.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/resume-radar/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/resume-radar/discussions)
- **Email**: support@resumeradar.com

---

**Built with ❤️ by [Your Name](https://yourportfolio.com)**

*Helping job seekers land their dream jobs, one optimized resume at a time.*
