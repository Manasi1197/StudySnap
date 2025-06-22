import { useState, useCallback } from 'react';
import { translateTextCached, translateBatch, LingoTranslationResponse } from '../lib/lingo';
import toast from 'react-hot-toast';

export interface TranslationState {
  isTranslating: boolean;
  error: string | null;
  currentLanguage: string;
}

export function useTranslation(defaultLanguage: string = 'en') {
  const [state, setState] = useState<TranslationState>({
    isTranslating: false,
    error: null,
    currentLanguage: defaultLanguage
  });

  const translateSingle = useCallback(async (
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<string> => {
    if (!text.trim() || targetLanguage === sourceLanguage) {
      return text;
    }

    setState(prev => ({ ...prev, isTranslating: true, error: null }));

    try {
      const result = await translateTextCached(text, targetLanguage, sourceLanguage);
      setState(prev => ({ ...prev, isTranslating: false, currentLanguage: targetLanguage }));
      return result.translatedText;
    } catch (error: any) {
      const errorMessage = error.message || 'Translation failed';
      setState(prev => ({ ...prev, isTranslating: false, error: errorMessage }));
      console.error('Translation error:', error);
      // Don't show error toast for fallback translations
      if (error.message && !error.message.includes('mock')) {
        toast.error(`Translation failed: ${errorMessage}`);
      }
      return text; // Return original text on error
    }
  }, []);

  const translateMultiple = useCallback(async (
    texts: string[],
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<string[]> => {
    if (targetLanguage === sourceLanguage) {
      return texts;
    }

    setState(prev => ({ ...prev, isTranslating: true, error: null }));

    try {
      console.log('🔄 Starting batch translation...', { 
        textCount: texts.length, 
        targetLanguage, 
        sourceLanguage 
      });

      const results = await translateBatch(texts, targetLanguage, sourceLanguage);
      
      setState(prev => ({ ...prev, isTranslating: false, currentLanguage: targetLanguage }));
      
      const translatedTexts = results.map(result => result.translatedText);
      console.log('✅ Batch translation completed successfully');
      
      return translatedTexts;
    } catch (error: any) {
      const errorMessage = error.message || 'Batch translation failed';
      setState(prev => ({ ...prev, isTranslating: false, error: errorMessage }));
      console.error('Batch translation error:', error);
      
      // Don't show error toast for fallback translations
      if (error.message && !error.message.includes('mock')) {
        toast.error(`Translation failed: ${errorMessage}`);
      }
      
      return texts; // Return original texts on error
    }
  }, []);

  const setLanguage = useCallback((language: string) => {
    setState(prev => ({ ...prev, currentLanguage: language }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    translateSingle,
    translateMultiple,
    setLanguage,
    clearError
  };
}