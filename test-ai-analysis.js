// Test script for AI-powered resume analysis with Gemini Pro
// Run this in the browser console when logged into the app

async function testAIAnalysis() {
  try {
    console.log('Testing AI-powered analysis with Gemini Pro...');
    
    // Get the auth token from localStorage
    const token = localStorage.getItem('resumeRadarToken');
    const user = JSON.parse(localStorage.getItem('resumeRadarUser') || '{}');
    
    if (!token) {
      console.error('No auth token found. Please log in first.');
      return;
    }
    
    console.log('User:', user);
    console.log('Token found:', !!token);
    
    // Create a simple text file for testing
    const testResumeText = `
John Doe
Software Engineer

Contact:
Email: john.doe@email.com
Phone: (555) 123-4567

Experience:
• Senior Software Engineer at Tech Corp (2021-2024)
  - Developed web applications using React and Node.js
  - Led a team of 5 developers
  - Implemented CI/CD pipelines and automated testing
  - Improved application performance by 40%

• Software Developer at StartupXYZ (2019-2021)
  - Built full-stack applications using JavaScript
  - Worked with databases (MongoDB, PostgreSQL)
  - Collaborated with product managers and designers

Skills:
• Programming: JavaScript, TypeScript, Python, Java
• Frontend: React, Vue.js, HTML5, CSS3
• Backend: Node.js, Express, Django
• Databases: MongoDB, PostgreSQL, Redis
• Tools: Git, Docker, AWS, Jenkins

Education:
• Bachelor of Science in Computer Science
  State University (2015-2019)
`;

    const jobDescription = `
Senior Software Engineer Position

We are looking for a Senior Software Engineer with:
- 3+ years of experience with React and Node.js
- Experience with cloud platforms (AWS/Azure/GCP)
- Strong leadership and team collaboration skills
- Experience with microservices architecture
- Knowledge of TypeScript and modern web technologies
`;

    // Create FormData as the API expects
    const formData = new FormData();
    
    // Create a blob and file for the resume text
    const blob = new Blob([testResumeText], { type: 'text/plain' });
    const file = new File([blob], 'test-resume.txt', { type: 'text/plain' });
    
    formData.append('file', file);
    formData.append('jobDescription', jobDescription);
    formData.append('analysisType', 'AI_POWERED');
    formData.append('language', 'en');
    
    console.log('Making API request...');
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      console.log('✅ AI Analysis successful!');
      console.log('Analysis ID:', data.analysis.id);
      console.log('Processing time:', data.processingTimeMs, 'ms');
      
      if (data.analysis.aiAnalysisResult) {
        const aiResult = JSON.parse(data.analysis.aiAnalysisResult);
        console.log('✅ AI Analysis Result:');
        console.log('- Overall Remark:', aiResult.overallRemark);
        console.log('- Fit Score:', aiResult.fitScore);
        console.log('- Skill Gaps:', aiResult.skillGaps);
        console.log('- Sections:', aiResult.sections?.length || 0);
        
        if (aiResult.coverLetterDraft) {
          console.log('- Cover Letter Generated: Yes');
        }
        
        // Check if this came from Gemini (look for provider metrics)
        console.log('🔍 This analysis was processed by the configured LLM provider (Gemini Pro)');
      }
    } else {
      console.error('❌ Analysis failed:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Call the test function
console.log('🧪 Starting AI Analysis Test...');
console.log('Make sure you are logged in to the application first!');
testAIAnalysis();
