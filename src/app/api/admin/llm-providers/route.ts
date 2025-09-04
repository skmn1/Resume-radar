import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { UserRole } from '@/types';
import { LLMFactory } from '@/lib/llm';

export async function GET(request: NextRequest) {
  try {
    // Require SUPER_ADMIN for LLM configuration access
    const authResult = await requireAuth(request, UserRole.SUPER_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Get all LLM provider configurations
    const providers = await LLMFactory.getProviderConfigs();
    
    // Add configuration status for each provider
    const providersWithStatus = providers.map(provider => {
      const client = LLMFactory.getClient(provider.name);
      return {
        ...provider,
        isConfigured: client?.isConfigured() || false,
        displayName: client?.displayName || provider.displayName
      };
    });

    return NextResponse.json({
      success: true,
      providers: providersWithStatus
    });

  } catch (error) {
    console.error('LLM providers fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch LLM providers' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Require SUPER_ADMIN for LLM configuration changes
    const authResult = await requireAuth(request, UserRole.SUPER_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const body = await request.json();
    const { defaultProvider } = body;

    if (!defaultProvider || typeof defaultProvider !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Default provider name is required' },
        { status: 400 }
      );
    }

    // Verify the provider exists and is configured
    const client = LLMFactory.getClient(defaultProvider);
    if (!client) {
      return NextResponse.json(
        { success: false, message: 'LLM provider not found' },
        { status: 404 }
      );
    }

    if (!client.isConfigured()) {
      return NextResponse.json(
        { success: false, message: 'LLM provider is not properly configured (missing API key)' },
        { status: 400 }
      );
    }

    // Set the new default provider
    await LLMFactory.setDefaultProvider(defaultProvider);

    // Create audit log
    const { createAuditLog } = await import('@/lib/rbac');
    await createAuditLog(
      user,
      'LLM_DEFAULT_CHANGED',
      `llm:${defaultProvider}`,
      { newDefaultProvider: defaultProvider },
      request
    );

    return NextResponse.json({
      success: true,
      message: `${client.displayName} set as default LLM provider`
    });

  } catch (error) {
    console.error('LLM provider update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update LLM provider' },
      { status: 500 }
    );
  }
}
