'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CoverLetterResult } from '@/types/jobMatching';

interface CoverLetterEditorProps {
  initialContent: CoverLetterResult;
  onSave?: (content: string) => void;
  onRegenerate?: () => void;
}

export default function CoverLetterEditor({
  initialContent,
  onSave,
  onRegenerate
}: CoverLetterEditorProps) {
  const [content, setContent] = useState(initialContent.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save handler
  const handleSave = useCallback(async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(content);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [content, onSave]);

  // Auto-save debounce
  useEffect(() => {
    if (!isEditing) return;
    
    const timeoutId = setTimeout(() => {
      handleSave();
    }, 2000); // Auto-save after 2 seconds of no typing

    return () => clearTimeout(timeoutId);
  }, [content, isEditing, handleSave]);
      } catch (error) {
        console.error('Save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = content.length;

  const getWordCountColor = () => {
    if (wordCount < 250) return 'text-yellow-600';
    if (wordCount > 400) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditing
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {isEditing ? '✏️ Editing' : '📖 Reading'}
          </button>
          
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              🔄 Regenerate
            </button>
          )}

          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? '💾 Saving...' : '💾 Save Now'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className={`font-medium ${getWordCountColor()}`}>
            {wordCount} words
            {wordCount < 250 && ' (add more)'}
            {wordCount > 400 && ' (too long)'}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            {charCount} characters
          </div>
          {lastSaved && !isSaving && (
            <div className="text-green-600 text-xs">
              ✓ Saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
            className="w-full min-h-[500px] p-6 font-serif text-base leading-relaxed resize-none focus:outline-none dark:bg-gray-800 dark:text-gray-100"
            placeholder="Your cover letter content..."
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '12pt',
              lineHeight: '1.8'
            }}
          />
        ) : (
          <div
            className="p-6 font-serif text-base leading-relaxed whitespace-pre-wrap"
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '12pt',
              lineHeight: '1.8'
            }}
          >
            {content}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {initialContent.suggestions && initialContent.suggestions.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">💡 AI Suggestions</h4>
          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            {initialContent.suggestions.map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Highlighted Skills */}
      {initialContent.highlightedSkills && initialContent.highlightedSkills.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 Skills Mentioned</h4>
          <div className="flex flex-wrap gap-2">
            {initialContent.highlightedSkills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
