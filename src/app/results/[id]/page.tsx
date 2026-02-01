'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button, Card, CardHeader, CardContent, LoadingSpinner } from '@/components/ui';
import { Citations } from '@/components/Citations';
import { Analysis, Suggestion } from '@/types';

export default function ResultsPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (!id) {
      setError('Invalid analysis ID');
      setLoading(false);
      return;
    }
    
    fetchAnalysis();
  }, [user, token, id, router]);

  const fetchAnalysis = async () => {
    if (!token || !id) return;
    
    try {
      const response = await fetch(`/api/analyses/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError(data.message || 'Failed to fetch analysis');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const getScoreColor = (score: number) => {
    const percentage = formatScore(score);
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    const percentage = formatScore(score);
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-900';
    if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  const getAnalysisTypeDisplay = (type: string) => {
    return type === 'AI_POWERED' ? 'AI-Powered' : 'Standard';
  };

  const getAnalysisTypeBadge = (type: string) => {
    return type === 'AI_POWERED' 
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Analysis Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error || 'The requested analysis could not be found.'}
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Resume Analysis Results
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getAnalysisTypeBadge(analysis.analysisType)}`}>
                  {getAnalysisTypeDisplay(analysis.analysisType)}
                </span>
                {analysis.aiAnalysisResult?.ragEnabled && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    ✓ RAG-Enhanced
                  </span>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Analysis for: {analysis.filename}
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Overall Score */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${getScoreBgColor(analysis.overallScore)} ${getScoreColor(analysis.overallScore)}`}>
                {formatScore(analysis.overallScore)}%
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
                Overall ATS Score
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {formatScore(analysis.overallScore) >= 80
                  ? 'Excellent! Your resume is well-optimized for ATS systems.'
                  : formatScore(analysis.overallScore) >= 60
                  ? 'Good! There are some areas for improvement.'
                  : 'Needs improvement. Follow the suggestions below to optimize your resume.'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Score Breakdown */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Score Breakdown
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300">Keyword Match</span>
                  <span className={`font-semibold ${getScoreColor(analysis.keywordScore)}`}>
                    {formatScore(analysis.keywordScore)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300">Formatting</span>
                  <span className={`font-semibold ${getScoreColor(analysis.formattingScore)}`}>
                    {formatScore(analysis.formattingScore)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300">Readability</span>
                  <span className={`font-semibold ${getScoreColor(analysis.readabilityScore)}`}>
                    {formatScore(analysis.readabilityScore)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300">Action Verbs</span>
                  <span className={`font-semibold ${getScoreColor(analysis.actionVerbScore)}`}>
                    {formatScore(analysis.actionVerbScore)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Keywords Found */}
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Keywords Found ({analysis.keywordsFound.length})
                </h3>
              </CardHeader>
              <CardContent>
                {analysis.keywordsFound.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordsFound.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">No keywords found in your resume.</p>
                )}
              </CardContent>
            </Card>

            {/* Missing Keywords */}
            {analysis.keywordsMissing.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Missing Keywords ({analysis.keywordsMissing.length})
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordsMissing.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                    Consider adding these keywords naturally throughout your resume to improve ATS compatibility.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Citations from RAG */}
          {analysis.aiAnalysisResult?.ragEnabled && analysis.aiAnalysisResult?.citations && (
            <div className="lg:col-span-2">
              <Citations 
                citations={analysis.aiAnalysisResult.citations} 
                ragEnabled={analysis.aiAnalysisResult.ragEnabled}
              />
            </div>
          )}

          {/* Suggestions */}
          <div>
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Recommendations ({analysis.suggestions.length})
                </h3>
              </CardHeader>
              <CardContent>
                {analysis.suggestions.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.suggestions.map((suggestion, index) => (
                      <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100">
                            {suggestion.title}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {suggestion.description}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                          Suggestion: {suggestion.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">
                    Great! No specific suggestions at this time.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button onClick={() => router.push('/dashboard')}>
            Analyze Another Resume
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Download Report
          </Button>
        </div>
      </div>
    </div>
  );
}
