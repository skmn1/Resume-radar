'use client';

import React, { useState } from 'react';
import { AnalysisCitation } from '@/types';
import { Card, CardHeader, CardContent } from './ui';

interface CitationsProps {
  citations?: AnalysisCitation[];
  ragEnabled?: boolean;
}

export function Citations({ citations, ragEnabled }: CitationsProps) {
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  if (!ragEnabled || !citations || citations.length === 0) {
    return null;
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.85) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.85) return 'High';
    if (score >= 0.7) return 'Medium';
    return 'Relevant';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Evidence from Your Resume
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              All analysis is based on these verified sections from your resume
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            ✓ RAG-Enhanced
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {citations.map((citation) => (
            <div
              key={citation.id}
              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedCitation(
                  expandedCitation === citation.id ? null : citation.id
                )}
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-sm font-mono font-medium text-slate-700 dark:text-slate-300">
                    {citation.id.replace('citation_', '')}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {citation.section}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {citation.content.substring(0, 80)}
                      {citation.content.length > 80 ? '...' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(citation.relevanceScore)}`}>
                    {getRelevanceLabel(citation.relevanceScore)}
                  </span>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${expandedCitation === citation.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {expandedCitation === citation.id && (
                <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {citation.content}
                    </p>
                  </div>
                  {citation.lineReference && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Reference: {citation.lineReference} • Relevance: {Math.round(citation.relevanceScore * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>RAG-Enhanced Analysis:</strong> This analysis is grounded in the specific content shown above from your resume. No information was invented or assumed—every insight is directly traceable to these verified sections.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
