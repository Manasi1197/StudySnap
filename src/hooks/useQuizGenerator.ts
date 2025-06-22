import { useState } from 'react';
import { generateQuizWithAI, extractTextFromImage, GenerateQuizRequest } from '../lib/openai';
import { extractTextFromPDF, isPDFFile } from '../lib/pdfExtractor';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface UploadedFile {
  id: string;
  name: string;
  type: 'text' | 'image' | 'pdf';
  content: string;
  size: number;
  extractedText?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
}

export interface GeneratedQuiz {
  id: string;
  title: string;
  description: string;
  questions: any[];
  flashcards: any[];
  createdAt: Date;
  estimatedTime: number;
}

export function useQuizGenerator(initialQuiz?: GeneratedQuiz) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [textInput, setTextInput] = useState('');
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(initialQuiz || null);
  const [isGenerating, setIsGenerating] = useState(false);

  const processFile = async (file: File, fileId: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, processingStatus: 'processing' } : f
    ));

    try {
      let extractedText = '';

      if (isPDFFile(file)) {
        // Process PDF file
        extractedText = await extractTextFromPDF(file);
      } else if (file.type.startsWith('image/')) {
        // Process image file with OpenAI Vision
        const base64 = await fileToBase64(file);
        extractedText = await extractTextFromImage(base64);
      } else {
        // Process text file
        extractedText = await file.text();
      }
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          extractedText, 
          content: extractedText,
          processingStatus: 'completed' 
        } : f
      ));
    } catch (error) {
      console.error('File processing error:', error);
      toast.error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, processingStatus: 'error' } : f
      ));
    }
  };

  const generateQuiz = async (settings: any) => {
    setIsGenerating(true);

    try {
      // Combine all content
      const allContent = [
        textInput,
        ...uploadedFiles.map(f => f.content)
      ].filter(Boolean).join('\n\n');

      if (!allContent.trim()) {
        throw new Error('No content to generate quiz from');
      }

      // Check if OpenAI API key is available
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
      }

      // Use real AI generation
      const request: GenerateQuizRequest = {
        content: allContent,
        questionCount: settings.questionCount,
        difficulty: settings.difficulty,
        questionTypes: settings.questionTypes,
        includeFlashcards: settings.includeFlashcards,
        language: settings.language || 'en'
      };

      console.log('🤖 Generating quiz with OpenAI...', request);
      const aiResponse = await generateQuizWithAI(request);

      const quiz: GeneratedQuiz = {
        id: Math.random().toString(36).substr(2, 9),
        title: aiResponse.title,
        description: aiResponse.description,
        questions: aiResponse.questions,
        flashcards: aiResponse.flashcards,
        createdAt: new Date(),
        estimatedTime: Math.ceil(aiResponse.questions.length * 1.5)
      };

      console.log('✅ Quiz generated successfully:', quiz);
      toast.success('Quiz generated successfully with AI!');

      // Save to Supabase if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveQuizToDatabase(quiz, user.id);
      }

      setGeneratedQuiz(quiz);
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      
      // Handle specific OpenAI errors
      if (error.message?.includes('API key')) {
        toast.error('OpenAI API key is invalid or not configured. Please check your API key.');
      } else if (error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message?.includes('insufficient_quota')) {
        toast.error('OpenAI API quota exceeded. Please check your billing.');
      } else {
        toast.error(`Failed to generate quiz: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const saveQuizToDatabase = async (quiz: GeneratedQuiz, userId: string) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .insert({
          user_id: userId,
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions,
          flashcards: quiz.flashcards,
          settings: {
            question_count: quiz.questions.length,
            difficulty: 'mixed',
            include_flashcards: quiz.flashcards.length > 0,
            question_types: [...new Set(quiz.questions.map(q => q.type))],
            language: 'en'
          },
          estimated_time: quiz.estimatedTime
        });

      if (error) throw error;
      console.log('✅ Quiz saved to database');
    } catch (error) {
      console.error('Error saving quiz to database:', error);
      // Don't throw here - quiz generation succeeded, saving is optional
    }
  };

  const addFiles = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const reset = () => {
    setUploadedFiles([]);
    setTextInput('');
    setGeneratedQuiz(null);
    setIsGenerating(false);
  };

  return {
    uploadedFiles,
    textInput,
    setTextInput,
    generatedQuiz,
    setGeneratedQuiz, // Export this for manual setting
    isGenerating,
    processFile,
    generateQuiz,
    addFiles,
    removeFile,
    reset
  };
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}