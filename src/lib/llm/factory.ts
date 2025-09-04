import { prisma } from '@/lib/prisma';
import { LLMClient, LLMProviderConfig } from './types';
import { OpenAIClient } from './openai-client';
import { GeminiClient } from './gemini-client';

export class LLMFactory {
  private static clients: Map<string, LLMClient> = new Map();

  static {
    // Register available LLM clients
    this.clients.set('openai', new OpenAIClient());
    this.clients.set('gemini', new GeminiClient());
  }

  /**
   * Get the currently active LLM client based on database configuration
   */
  static async getActiveClient(): Promise<LLMClient> {
    try {
      // Get the default active LLM from database
      const activeProvider = await prisma.lLMProvider.findFirst({
        where: { 
          isActive: true,
          isDefault: true
        }
      });

      if (activeProvider) {
        const client = this.clients.get(activeProvider.name);
        if (client && client.isConfigured()) {
          return client;
        }
      }

      // Fallback: try to find any configured client
      for (const [, client] of this.clients) {
        if (client.isConfigured()) {
          return client;
        }
      }

      throw new Error('No LLM providers are configured');
    } catch (error) {
      console.error('Error getting active LLM client:', error);
      
      // Ultimate fallback: try OpenAI first, then Gemini
      const openAI = this.clients.get('openai');
      if (openAI?.isConfigured()) {
        return openAI;
      }
      
      const gemini = this.clients.get('gemini');
      if (gemini?.isConfigured()) {
        return gemini;
      }

      throw new Error('No LLM providers are configured');
    }
  }

  /**
   * Get a specific LLM client by name
   */
  static getClient(name: string): LLMClient | undefined {
    return this.clients.get(name);
  }

  /**
   * Get all available LLM clients
   */
  static getAllClients(): LLMClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get all configured LLM clients
   */
  static getConfiguredClients(): LLMClient[] {
    return Array.from(this.clients.values()).filter(client => client.isConfigured());
  }

  /**
   * Initialize LLM providers in database if they don't exist
   */
  static async initializeProviders(): Promise<void> {
    try {
      const providers = [
        {
          name: 'openai',
          displayName: 'OpenAI GPT-4o-mini',
          isActive: true,
          isDefault: true,
          config: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            maxTokens: 4000
          }),
          apiKeyEnvVar: 'OPENAI_API_KEY'
        },
        {
          name: 'gemini',
          displayName: 'Google Gemini 1.0 Pro',
          isActive: true,
          isDefault: false,
          config: JSON.stringify({
            model: 'gemini-1.0-pro',
            temperature: 0.3,
            maxTokens: 4000
          }),
          apiKeyEnvVar: 'GEMINI_API_KEY'
        }
      ];

      for (const provider of providers) {
        await prisma.lLMProvider.upsert({
          where: { name: provider.name },
          update: {
            displayName: provider.displayName,
            isActive: provider.isActive,
            config: provider.config,
            apiKeyEnvVar: provider.apiKeyEnvVar
          },
          create: provider
        });
      }

      console.log('LLM providers initialized successfully');
    } catch (error) {
      console.error('Error initializing LLM providers:', error);
    }
  }

  /**
   * Update LLM provider metrics after usage
   */
  static async updateProviderMetrics(
    providerName: string, 
    responseTime: number
  ): Promise<void> {
    try {
      const provider = await prisma.lLMProvider.findUnique({
        where: { name: providerName }
      });

      if (provider) {
        const newTotalUsage = provider.totalUsage + 1;
        const newAvgResponseTime = provider.avgResponseTime 
          ? (provider.avgResponseTime * provider.totalUsage + responseTime) / newTotalUsage
          : responseTime;

        await prisma.lLMProvider.update({
          where: { name: providerName },
          data: {
            totalUsage: newTotalUsage,
            avgResponseTime: newAvgResponseTime,
            lastUsedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error updating provider metrics:', error);
    }
  }

  /**
   * Set the default LLM provider
   */
  static async setDefaultProvider(providerName: string): Promise<void> {
    try {
      // First, unset all providers as default
      await prisma.lLMProvider.updateMany({
        data: { isDefault: false }
      });

      // Then set the specified provider as default
      await prisma.lLMProvider.update({
        where: { name: providerName },
        data: { isDefault: true, isActive: true }
      });

      console.log(`Set ${providerName} as default LLM provider`);
    } catch (error) {
      console.error('Error setting default provider:', error);
      throw error;
    }
  }

  /**
   * Get all LLM provider configurations from database
   */
  static async getProviderConfigs(): Promise<LLMProviderConfig[]> {
    try {
      const providers = await prisma.lLMProvider.findMany({
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ]
      });

      return providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName,
        isActive: provider.isActive,
        isDefault: provider.isDefault,
        config: JSON.parse(provider.config),
        apiKeyEnvVar: provider.apiKeyEnvVar,
        totalUsage: provider.totalUsage,
        avgResponseTime: provider.avgResponseTime || undefined,
        lastUsedAt: provider.lastUsedAt || undefined
      }));
    } catch (error) {
      console.error('Error getting provider configs:', error);
      return [];
    }
  }
}
