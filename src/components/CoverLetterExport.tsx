'use client';

import React, { useState } from 'react';
import { CoverLetterExportOptions } from '@/types/jobMatching';
import { exportCoverLetter, printCoverLetter } from '@/lib/exportCoverLetter';

interface CoverLetterExportProps {
  content: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  companyName?: string;
  jobTitle?: string;
}

export default function CoverLetterExport({
  content,
  candidateName,
  candidateEmail,
  candidatePhone,
  companyName,
  jobTitle
}: CoverLetterExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleExport = async (format: 'txt' | 'html' | 'pdf' | 'docx') => {
    setIsExporting(true);
    try {
      const options: CoverLetterExportOptions = {
        format,
        candidateName,
        candidateEmail,
        candidatePhone,
        companyName,
        includeDate: true,
        includeSignature: true
      };

      if (format === 'pdf') {
        // Use print for PDF
        printCoverLetter(content, options);
      } else {
        await exportCoverLetter(content, options);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setShowOptions(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-medium"
        disabled={isExporting}
      >
        {isExporting ? '📥 Exporting...' : '📥 Export Cover Letter'}
      </button>

      {showOptions && (
        <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10 min-w-[250px]">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">Choose Format</p>
          </div>
          
          <div className="p-2 space-y-1">
            <button
              onClick={() => handleExport('txt')}
              className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">📄</span>
              <div>
                <div className="font-medium">Plain Text (.txt)</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">For copy-paste</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('html')}
              className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">🌐</span>
              <div>
                <div className="font-medium">HTML (.html)</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">For email or web</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">📑</span>
              <div>
                <div className="font-medium">PDF (Print)</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Professional format</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('docx')}
              className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">📝</span>
              <div>
                <div className="font-medium">Word Compatible</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Edit in MS Word</div>
              </div>
            </button>
          </div>

          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowOptions(false)}
              className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
