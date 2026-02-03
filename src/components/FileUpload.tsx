'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { AnalysisType } from '@/types';

interface FileUploadProps {
  onUpload: (file: File, jobDescription?: string, analysisType?: AnalysisType) => void;
  isUploading: boolean;
}

function EnhancedFileUpload({ onUpload, isUploading }: FileUploadProps) {
  const [jobDescription, setJobDescription] = useState('');
  // Always use AI_POWERED - no user selection needed
  const analysisType = AnalysisType.AI_POWERED;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      onUpload(file, jobDescription.trim() || undefined, analysisType);
    }
  }, [onUpload, jobDescription, analysisType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <div className="space-y-6">
      {/* Job Description */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Job Description (Optional)
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Paste the job description to get personalized AI analysis and cover letter generation.
        </p>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Paste the job description here for more accurate analysis..."
          disabled={isUploading}
        />
      </div>

      {/* File Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="mx-auto w-12 h-12 mb-4">
            <svg className="w-full h-full text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          {isUploading ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">Analyzing your resume...</p>
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : isDragActive ? (
            <p className="text-sm text-blue-600 dark:text-blue-400">Drop your resume here...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Drag and drop your resume here, or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supports PDF and DOCX files (max 10MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Language Detection Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              AI-Powered Analysis with RAG
            </h3>
            <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Your resume will be analyzed using advanced AI with Retrieval-Augmented Generation (RAG) technology. 
              Supports English and French with automatic language detection.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced file upload component with analysis type selection
export default EnhancedFileUpload;

// Keep the old export for backward compatibility
export const FileUpload = ({ onFileSelect, accept, maxSize, disabled }: {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: maxSize || 10 * 1024 * 1024,
    multiple: false,
    disabled
  });

  const rejectionErrors = fileRejections.map(rejection => 
    rejection.errors.map(error => error.message).join(', ')
  ).join(', ');

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="flex justify-center">
            <svg
              className="h-12 w-12 text-slate-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          <div className="space-y-2">
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-600">
                Drop your resume here...
              </p>
            ) : (
              <>
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                  Drop your resume here, or{' '}
                  <span className="text-blue-600 hover:text-blue-700">browse</span>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Supports PDF and DOCX files up to 10MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      
      {rejectionErrors && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {rejectionErrors}
        </p>
      )}
    </div>
  );
};
