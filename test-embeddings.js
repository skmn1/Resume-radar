const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testEmbeddings() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log('🔑 Checking API Key...');
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env file!');
    return;
  }
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  
  const client = new GoogleGenAI({ apiKey });
  
  try {
    console.log('🧪 Testing embedding generation...');
    const result = await client.models.embedContent({
      model: 'text-embedding-004',
      contents: [
        { parts: [{ text: 'Software engineer with 5 years experience in React and Node.js' }] }
      ]
    });
    
    if (result.embeddings && result.embeddings[0] && result.embeddings[0].values) {
      console.log('✅ SUCCESS! Embeddings work!');
      console.log('📊 Embedding size:', result.embeddings[0].values.length);
      console.log('📝 First 5 numbers:', result.embeddings[0].values.slice(0, 5));
    } else {
      console.log('⚠️ Weird response format:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error('Full error:', error);
  }
}

testEmbeddings();
