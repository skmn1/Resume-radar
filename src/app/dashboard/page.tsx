'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { FileUpload } from '@/components/FileUpload';
import { Button, Textarea, Card, CardHeader, CardContent, LoadingSpinner } from '@/components/ui';

interface AnalysisHistory {
  id: string;
  filename: string;
  overallScore: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
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
      }
    } catch (error) {
      console.error('Failed to fetch analysis history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !token) return;
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (jobDescription) {
        formData.append('jobDescription', jobDescription);
      }
      
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
        alert(data.message || 'Analysis failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Resume Analysis Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Upload your resume and get instant ATS optimization feedback.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Upload Resume for Analysis
                </h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Resume File
                  </h3>
                  <FileUpload
                    onFileSelect={setSelectedFile}
                    disabled={loading}
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                    </p>
                  )}
                </div>

                <div>
                  <Textarea
                    label="Job Description (Optional)"
                    placeholder="Paste the job description here for targeted keyword analysis..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={6}
                    disabled={loading}
                  />
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Adding a job description helps us provide more targeted keyword recommendations.
                  </p>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || loading}
                  size="lg"
                  className="w-full"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Analyzing Resume...</span>
                    </div>
                  ) : (
                    'Analyze Resume'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Analysis History */}
          <div>
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Analysis History
                </h2>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : analyses.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                    No analyses yet. Upload your first resume to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        onClick={() => router.push(`/results/${analysis.id}`)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {analysis.filename}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(analysis.createdAt)}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              formatScore(analysis.overallScore) >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : formatScore(analysis.overallScore) >= 60
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {formatScore(analysis.overallScore)}%
                            </span>
                          </div>
                        </div>
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
