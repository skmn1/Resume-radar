'use client';

import React from 'react';
import { JobMatchResult, JobRequirement } from '@/types/jobMatching';

interface JobMatchingDashboardProps {
  matchResult: JobMatchResult;
}

export default function JobMatchingDashboard({ matchResult }: JobMatchingDashboardProps) {
  const {
    overallMatch,
    skillsMatch,
    experienceMatch,
    educationMatch,
    requirements,
    strengths,
    gaps,
    recommendations
  } = matchResult;

  // Determine match quality
  const getMatchQuality = (score: number): { label: string; color: string; bgColor: string } => {
    if (score >= 75) return { label: 'Strong Match', color: 'text-green-700', bgColor: 'bg-green-100' };
    if (score >= 50) return { label: 'Good Match', color: 'text-blue-700', bgColor: 'bg-blue-100' };
    if (score >= 30) return { label: 'Partial Match', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
    return { label: 'Weak Match', color: 'text-red-700', bgColor: 'bg-red-100' };
  };

  const overall = getMatchQuality(overallMatch);
  
  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    if (priority === 'required') return '🔴';
    if (priority === 'preferred') return '🟡';
    return '⚪';
  };

  // Get match icon
  const getMatchIcon = (found: boolean, score: number) => {
    if (!found) return '❌';
    if (score > 0.7) return '✅';
    return '⚠️';
  };

  return (
    <div className="space-y-6">
      {/* Overall Match Score */}
      <div className={`${overall.bgColor} rounded-lg p-6 border-2 border-current ${overall.color}`}>
        <div className="text-center">
          <div className="text-5xl font-bold mb-2">{Math.round(overallMatch)}%</div>
          <div className="text-xl font-semibold">{overall.label}</div>
          <div className="text-sm mt-2 opacity-75">Overall Job Match Score</div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-3xl font-bold text-purple-600">{Math.round(skillsMatch)}%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Skills Match</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-3xl font-bold text-blue-600">{Math.round(experienceMatch)}%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Experience Match</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-3xl font-bold text-indigo-600">{Math.round(educationMatch)}%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Education Match</div>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4">📋 Requirements Analysis</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {requirements.map((req) => (
            <div key={req.id} className="border-l-4 pl-4 py-2" style={{
              borderColor: req.foundInResume ? '#10b981' : req.priority === 'required' ? '#ef4444' : '#f59e0b'
            }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{getMatchIcon(req.foundInResume, req.matchScore)}</span>
                    <span>{getPriorityIcon(req.priority)}</span>
                    <span className="font-medium">{req.text}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                      {req.category}
                    </span>
                  </div>
                  {req.foundInResume && req.resumeEvidence && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                      "{req.resumeEvidence}"
                    </div>
                  )}
                  {req.sectionReference && (
                    <div className="mt-1 text-xs text-gray-500">
                      Found in: {req.sectionReference}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold ml-4">
                  {Math.round(req.matchScore * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths and Gaps Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">💪 Your Strengths</h3>
          {strengths.length > 0 ? (
            <ul className="space-y-2">
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                  <span className="mt-1">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-600 dark:text-green-400">
              No strong matches identified. Consider adding more relevant experience to your resume.
            </p>
          )}
        </div>

        {/* Gaps */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">⚠️ Missing or Weak Areas</h3>
          {gaps.length > 0 ? (
            <ul className="space-y-2">
              {gaps.slice(0, 10).map((gap, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                  <span className="mt-1">•</span>
                  <span>{gap}</span>
                </li>
              ))}
              {gaps.length > 10 && (
                <li className="text-xs text-red-600 dark:text-red-400 mt-2">
                  +{gaps.length - 10} more gaps...
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">
              Great! All requirements are well-addressed in your resume.
            </p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">💡 Recommendations</h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                <span className="mt-1">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
