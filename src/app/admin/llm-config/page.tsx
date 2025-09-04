'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LLMProvider {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  isDefault: boolean;
  isConfigured: boolean;
  totalUsage: number;
  avgResponseTime?: number;
  lastUsedAt?: string;
}

export default function LLMConfigPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch('/api/admin/llm-providers', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }

        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }

        const data = await response.json();
        if (data.success) {
          setProviders(data.providers);
        } else {
          setError(data.message || 'Failed to fetch LLM providers');
        }
      } catch (err) {
        setError('Failed to fetch LLM providers');
        console.error('Error fetching providers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [router]);

  const refetchProviders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/admin/llm-providers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (response.status === 403) {
        router.push('/dashboard');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setProviders(data.providers);
      } else {
        setError(data.message || 'Failed to fetch LLM providers');
      }
    } catch (err) {
      setError('Failed to fetch LLM providers');
      console.error('Error fetching providers:', err);
    }
  };

  const setDefaultProvider = async (providerName: string) => {
    setUpdating(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/llm-providers', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultProvider: providerName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh the providers list
        await refetchProviders();
      } else {
        setError(data.message || 'Failed to update default provider');
      }
    } catch (err) {
      setError('Failed to update default provider');
      console.error('Error updating provider:', err);
    } finally {
      setUpdating(false);
    }
  };

  const formatResponseTime = (time?: number) => {
    if (!time) return 'N/A';
    return time < 1000 ? `${Math.round(time)}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const formatLastUsed = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">LLM Configuration</h1>
          <p className="text-gray-600 mt-2">
            Manage and configure Large Language Model providers for AI-powered resume analysis.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Provider Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`bg-white rounded-lg shadow border-2 ${
                provider.isDefault ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {provider.displayName}
                    </h3>
                    {provider.isDefault && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        provider.isConfigured ? 'bg-green-400' : 'bg-red-400'
                      }`}
                      title={provider.isConfigured ? 'Configured' : 'Not Configured'}
                    ></div>
                  </div>
                </div>

                {/* Configuration Status */}
                <div className="mb-4">
                  {provider.isConfigured ? (
                    <div className="flex items-center text-green-600">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Configured & Ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Missing API Key</span>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Usage:</span>
                    <span className="font-medium">{provider.totalUsage.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Avg Response Time:</span>
                    <span className="font-medium">{formatResponseTime(provider.avgResponseTime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Used:</span>
                    <span className="font-medium">{formatLastUsed(provider.lastUsedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDefaultProvider(provider.name)}
                    disabled={
                      provider.isDefault || 
                      !provider.isConfigured || 
                      updating
                    }
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${
                      provider.isDefault
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : !provider.isConfigured
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : updating
                        ? 'bg-blue-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {updating ? 'Updating...' : provider.isDefault ? 'Current Default' : 'Set as Default'}
                  </button>
                </div>

                {/* Configuration Hint */}
                {!provider.isConfigured && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      To configure this provider, add your API key to the environment variables and restart the application.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Configuration Instructions</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>OpenAI:</strong> Add your <code>OPENAI_API_KEY</code> to the environment variables.</p>
            <p><strong>Google Gemini:</strong> Add your <code>GEMINI_API_KEY</code> to the environment variables.</p>
            <p className="mt-3 text-blue-700">
              After adding API keys, restart the application for changes to take effect.
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
