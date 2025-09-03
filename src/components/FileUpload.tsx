'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from './ui';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '.pdf,.docx',
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false
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
    maxSize,
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
