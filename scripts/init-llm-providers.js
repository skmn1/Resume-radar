const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeLLMProviders() {
  try {
    console.log('Initializing LLM providers...');

    // Initialize OpenAI provider
    await prisma.lLMProvider.upsert({
      where: { name: 'openai' },
      update: {
        displayName: 'OpenAI GPT-4o-mini',
        isActive: true,
        config: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 4000
        }),
        apiKeyEnvVar: 'OPENAI_API_KEY'
      },
      create: {
        name: 'openai',
        displayName: 'OpenAI GPT-4o-mini',
        isActive: true,
        isDefault: false, // Set Gemini as default
        config: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 4000
        }),
        apiKeyEnvVar: 'OPENAI_API_KEY'
      }
    });

    // Initialize Gemini provider as default
    await prisma.lLMProvider.upsert({
      where: { name: 'gemini' },
      update: {
        displayName: 'Google Gemini 1.5 Flash',
        isActive: true,
        isDefault: true,
        config: JSON.stringify({
          model: 'gemini-1.5-flash',
          temperature: 0.3,
          maxTokens: 4000
        }),
        apiKeyEnvVar: 'GEMINI_API_KEY'
      },
      create: {
        name: 'gemini',
        displayName: 'Google Gemini 1.5 Flash',
        isActive: true,
        isDefault: true, // Set as default for testing
        config: JSON.stringify({
          model: 'gemini-1.5-flash',
          temperature: 0.3,
          maxTokens: 4000
        }),
        apiKeyEnvVar: 'GEMINI_API_KEY'
      }
    });

    console.log('LLM providers initialized successfully!');
    
    // Verify the providers
    const providers = await prisma.lLMProvider.findMany();
    console.log('Available providers:', providers.map(p => ({ 
      name: p.name, 
      displayName: p.displayName, 
      isDefault: p.isDefault,
      isActive: p.isActive 
    })));

  } catch (error) {
    console.error('Error initializing LLM providers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initializeLLMProviders();
