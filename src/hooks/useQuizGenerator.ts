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

// Enhanced mock quiz data with better question types
const generateMockQuiz = (content: string, settings: any): GeneratedQuiz => {
  const topics = ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'History', 'Literature'];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  
  const mockQuestions = [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: 'What is the primary function of mitochondria in cells?',
      options: [
        'Protein synthesis',
        'Energy production',
        'DNA replication',
        'Waste removal'
      ],
      correctAnswer: 1,
      explanation: 'Mitochondria are known as the powerhouses of the cell because they produce ATP (adenosine triphosphate), which is the primary energy currency used by cells for various metabolic processes.',
      difficulty: 'medium',
      topic: 'Cell Biology'
    },
    {
      id: 'q2',
      type: 'true-false',
      question: 'Photosynthesis occurs only in the leaves of plants.',
      correctAnswer: false,
      explanation: 'While leaves are the primary site of photosynthesis, it can also occur in other green parts of plants such as stems and even some roots that contain chlorophyll.',
      difficulty: 'easy',
      topic: 'Plant Biology'
    },
    {
      id: 'q3',
      type: 'fill-blank',
      question: 'The process by which plants convert sunlight into chemical energy is called _______.',
      correctAnswer: 'photosynthesis',
      explanation: 'Photosynthesis is the process by which plants, algae, and some bacteria convert light energy (usually from the sun) into chemical energy stored in glucose molecules.',
      difficulty: 'easy',
      topic: 'Plant Biology'
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      question: 'Which element has the chemical symbol "Au"?',
      options: [
        'Silver',
        'Gold',
        'Aluminum',
        'Argon'
      ],
      correctAnswer: 1,
      explanation: 'Gold has the chemical symbol "Au" which comes from the Latin word "aurum" meaning gold.',
      difficulty: 'medium',
      topic: 'Chemistry'
    },
    {
      id: 'q5',
      type: 'fill-blank',
      question: 'The powerhouse of the cell is the _______.',
      correctAnswer: 'mitochondria',
      explanation: 'Mitochondria are called the powerhouse of the cell because they generate most of the cell\'s ATP through cellular respiration.',
      difficulty: 'easy',
      topic: 'Cell Biology'
    },
    {
      id: 'q6',
      type: 'true-false',
      question: 'Water boils at 100 degrees Celsius at sea level.',
      correctAnswer: true,
      explanation: 'At standard atmospheric pressure (sea level), water boils at exactly 100°C or 212°F.',
      difficulty: 'easy',
      topic: 'Physics'
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      question: 'What is the largest planet in our solar system?',
      options: [
        'Saturn',
        'Jupiter',
        'Neptune',
        'Earth'
      ],
      correctAnswer: 1,
      explanation: 'Jupiter is the largest planet in our solar system, with a mass greater than all other planets combined.',
      difficulty: 'easy',
      topic: 'Astronomy'
    },
    {
      id: 'q8',
      type: 'fill-blank',
      question: 'The study of living organisms is called _______.',
      correctAnswer: 'biology',
      explanation: 'Biology is the scientific study of life and living organisms, including their structure, function, growth, evolution, and distribution.',
      difficulty: 'easy',
      topic: 'Science'
    },
    {
      id: 'q9',
      type: 'true-false',
      question: 'The human brain uses approximately 20% of the body\'s total energy.',
      correctAnswer: true,
      explanation: 'Despite being only about 2% of body weight, the human brain consumes approximately 20% of the body\'s total energy, primarily in the form of glucose.',
      difficulty: 'medium',
      topic: 'Human Biology'
    },
    {
      id: 'q10',
      type: 'multiple-choice',
      question: 'Which gas makes up approximately 78% of Earth\'s atmosphere?',
      options: [
        'Oxygen',
        'Nitrogen',
        'Carbon dioxide',
        'Argon'
      ],
      correctAnswer: 1,
      explanation: 'Nitrogen makes up about 78% of Earth\'s atmosphere, while oxygen comprises about 21%, and the remaining 1% consists of other gases.',
      difficulty: 'medium',
      topic: 'Earth Science'
    },
    {
      id: 'q11',
      type: 'fill-blank',
      question: 'The basic unit of heredity is the _______.',
      correctAnswer: 'gene',
      explanation: 'A gene is the basic physical and functional unit of heredity, made up of DNA sequences that code for specific traits.',
      difficulty: 'medium',
      topic: 'Genetics'
    },
    {
      id: 'q12',
      type: 'true-false',
      question: 'Light travels faster than sound.',
      correctAnswer: true,
      explanation: 'Light travels at approximately 300,000 km/s in a vacuum, while sound travels at only about 343 m/s in air at room temperature.',
      difficulty: 'easy',
      topic: 'Physics'
    },
    {
      id: 'q13',
      type: 'multiple-choice',
      question: 'What is the pH of pure water?',
      options: [
        '6',
        '7',
        '8',
        '9'
      ],
      correctAnswer: 1,
      explanation: 'Pure water has a pH of 7, which is considered neutral on the pH scale that ranges from 0 (acidic) to 14 (basic).',
      difficulty: 'easy',
      topic: 'Chemistry'
    },
    {
      id: 'q14',
      type: 'fill-blank',
      question: 'The force that keeps planets in orbit around the sun is _______.',
      correctAnswer: 'gravity',
      explanation: 'Gravity is the fundamental force that attracts objects with mass toward each other, keeping planets in stable orbits around the sun.',
      difficulty: 'medium',
      topic: 'Physics'
    },
    {
      id: 'q15',
      type: 'true-false',
      question: 'All living things are made up of cells.',
      correctAnswer: true,
      explanation: 'The cell theory states that all living things are composed of one or more cells, making this statement true. This is one of the fundamental principles of biology.',
      difficulty: 'easy',
      topic: 'Cell Theory'
    }
  ];

  const mockFlashcards = [
    {
      id: 'f1',
      front: 'What is ATP?',
      back: 'Adenosine triphosphate - the primary energy currency of cells',
      topic: 'Biochemistry'
    },
    {
      id: 'f2',
      front: 'Mitochondria',
      back: 'Organelles known as the powerhouse of the cell, responsible for ATP production',
      topic: 'Cell Biology'
    },
    {
      id: 'f3',
      front: 'Photosynthesis',
      back: 'Process by which plants convert sunlight, CO2, and water into glucose and oxygen',
      topic: 'Plant Biology'
    },
    {
      id: 'f4',
      front: 'Gravity',
      back: 'The fundamental force that attracts objects with mass toward each other',
      topic: 'Physics'
    },
    {
      id: 'f5',
      front: 'Gene',
      back: 'The basic unit of heredity, made up of DNA sequences that code for traits',
      topic: 'Genetics'
    },
    {
      id: 'f6',
      front: 'pH Scale',
      back: 'Measures acidity/alkalinity from 0-14; 7 is neutral, <7 is acidic, >7 is basic',
      topic: 'Chemistry'
    },
    {
      id: 'f7',
      front: 'Cell Theory',
      back: 'All living things are made of cells; cells are the basic unit of life; all cells come from pre-existing cells',
      topic: 'Biology'
    },
    {
      id: 'f8',
      front: 'Jupiter',
      back: 'The largest planet in our solar system, with a mass greater than all other planets combined',
      topic: 'Astronomy'
    },
    {
      id: 'f9',
      front: 'Nitrogen',
      back: 'The gas that makes up approximately 78% of Earth\'s atmosphere',
      topic: 'Earth Science'
    },
    {
      id: 'f10',
      front: 'Brain Energy',
      back: 'The human brain uses approximately 20% of the body\'s total energy despite being only 2% of body weight',
      topic: 'Human Biology'
    }
  ];

  // Filter questions based on selected types
  const filteredQuestions = mockQuestions.filter(q => 
    settings.questionTypes.includes(q.type)
  );

  // Select questions based on settings
  const selectedQuestions = filteredQuestions.slice(0, Math.min(settings.questionCount, filteredQuestions.length));
  const selectedFlashcards = settings.includeFlashcards ? mockFlashcards.slice(0, Math.min(8, settings.questionCount)) : [];

  return {
    id: Math.random().toString(36).substr(2, 9),
    title: `${randomTopic} Study Quiz`,
    description: `A comprehensive quiz covering key concepts in ${randomTopic.toLowerCase()}. Test your understanding with ${selectedQuestions.length} carefully crafted questions designed to reinforce learning.`,
    questions: selectedQuestions,
    flashcards: selectedFlashcards,
    createdAt: new Date(),
    estimatedTime: Math.ceil(selectedQuestions.length * 1.5)
  };
};

export function useQuizGenerator() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [textInput, setTextInput] = useState('');
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
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
        // For demo purposes, simulate image text extraction
        extractedText = `Extracted text from ${file.name}: This is sample text extracted from the image. In a real scenario, this would be the actual text content from the image using OCR or AI vision.`;
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

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if we should use mock data (when API key is not available or for testing)
      const shouldUseMock = !import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_USE_MOCK_QUIZ === 'true';

      let quiz: GeneratedQuiz;

      if (shouldUseMock) {
        // Use mock data for testing
        quiz = generateMockQuiz(allContent, settings);
        toast.success('Mock quiz generated successfully! (API calls disabled for testing)');
      } else {
        // Use real AI generation with improved prompt for better question types
        const request: GenerateQuizRequest = {
          content: allContent,
          questionCount: settings.questionCount,
          difficulty: settings.difficulty,
          questionTypes: settings.questionTypes,
          includeFlashcards: settings.includeFlashcards,
          language: settings.language || 'en'
        };

        const aiResponse = await generateQuizWithAI(request);

        quiz = {
          id: Math.random().toString(36).substr(2, 9),
          title: aiResponse.title,
          description: aiResponse.description,
          questions: aiResponse.questions,
          flashcards: aiResponse.flashcards,
          createdAt: new Date(),
          estimatedTime: aiResponse.questions.length * 1.5
        };

        toast.success('Quiz generated successfully with AI!');
      }

      // Save to Supabase if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveQuizToDatabase(quiz, user.id);
      }

      setGeneratedQuiz(quiz);
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast.error('Failed to generate quiz. Please try again.');
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
          }
        });

      if (error) throw error;
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