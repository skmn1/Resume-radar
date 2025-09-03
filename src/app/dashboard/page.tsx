'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import FileUpload from '@/components/FileUpload';
import { Button, Card, CardHeader, CardContent, LoadingSpinner } from '@/components/ui';
import { AnalysisType, Analysis } from '@/types';

interface AnalysisHistory extends Analysis {
  _count?: { analyses: number };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    fetchAnalysisHistory();
  }, [user, token, router]);

  const fetchAnalysisHistory = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/analyses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setAnalyses(data.analyses);
      } else {
        setError(data.message || 'Failed to fetch analysis history');
      }
    } catch (error) {
      console.error('Failed to fetch analysis history:', error);
      setError('Network error while fetching history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpload = async (file: File, jobDescription?: string, analysisType?: AnalysisType) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (jobDescription) {
        formData.append('jobDescription', jobDescription);
      }
      formData.append('analysisType', analysisType || AnalysisType.STANDARD);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        router.push(`/results/${data.analysis.id}`);
      } else {
        setError(data.message || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnalysisTypeDisplay = (type: AnalysisType) => {
    return type === AnalysisType.AI_POWERED ? 'AI-Powered' : 'Standard';
  };

  const getAnalysisTypeBadge = (type: AnalysisType) => {
    return type === AnalysisType.AI_POWERED 
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Resume Analysis Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {user.name || user.email}! Upload your resume for intelligent ATS optimization.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <FileUpload onUpload={handleUpload} isUploading={loading} />
          </div>

          {/* Analysis History */}
          <div>
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Analysis History
                </h2>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : analyses.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      No analyses yet
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Upload your first resume to get started!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {analyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => router.push(`/results/${analysis.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {analysis.filename}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(analysis.createdAt)}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex flex-col items-end space-y-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              formatScore(analysis.overallScore) >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : formatScore(analysis.overallScore) >= 60
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {analysis.fitScore !== null && analysis.fitScore !== undefined 
                                ? `${analysis.fitScore}%` 
                                : `${formatScore(analysis.overallScore)}%`
                              }
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAnalysisTypeBadge(analysis.analysisType)}`}>
                              {getAnalysisTypeDisplay(analysis.analysisType)}
                            </span>
                          </div>
                        </div>
                        
                        {analysis.language && analysis.language !== 'en' && (
                          <div className="flex items-center mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {analysis.language.toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        {analysis.errorMessage && (
                          <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                            ⚠️ {analysis.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
