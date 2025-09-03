import { franc } from 'franc';
import { LanguageDetectionResult } from '@/types';

// Supported languages
const SUPPORTED_LANGUAGES = {
  'eng': 'en',
  'fra': 'fr'
};

const LANGUAGE_NAMES = {
  'en': 'English',
  'fr': 'French'
};

/**
 * Detect the language of the given text
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length < 50) {
    return {
      language: 'en',
      confidence: 0.5,
      isSupported: true
    };
  }

  // Clean text for better detection
  const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const detected = franc(cleanText);
  const language = SUPPORTED_LANGUAGES[detected as keyof typeof SUPPORTED_LANGUAGES] || 'en';
  
  // Calculate confidence based on text length and detection result
  let confidence = detected === 'und' ? 0.3 : 0.8;
  if (cleanText.length < 100) confidence *= 0.7;
  if (cleanText.length < 200) confidence *= 0.8;
  
  return {
    language,
    confidence: Math.min(confidence, 1.0),
    isSupported: Object.values(SUPPORTED_LANGUAGES).includes(language)
  };
}

/**
 * Get the display name for a language code
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code as keyof typeof LANGUAGE_NAMES] || code.toUpperCase();
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(code: string): boolean {
  return Object.values(SUPPORTED_LANGUAGES).includes(code);
}

/**
 * Get supported languages list
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }));
}

/**
 * Detect mixed language content
 */
export function detectMixedLanguages(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const languages = new Set<string>();
  
  paragraphs.forEach(paragraph => {
    if (paragraph.trim().length > 30) {
      const detection = detectLanguage(paragraph);
      if (detection.confidence > 0.6) {
        languages.add(detection.language);
      }
    }
  });
  
  return Array.from(languages);
}
