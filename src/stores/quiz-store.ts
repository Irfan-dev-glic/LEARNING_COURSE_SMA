import { create } from 'zustand';
import { apiClient } from '../lib/api-client';
import type { QuizDetail, SubmitQuizResponse } from '../shared/contracts';

interface QuizState {
  quiz: QuizDetail | null;
  answers: Record<string, number>;
  currentIndex: number;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  result: SubmitQuizResponse | null;

  loadQuiz: (kuisId: string) => Promise<void>;
  selectAnswer: (soalId: string, pilihanIndex: number) => void;
  setCurrentIndex: (index: number) => void;
  submitQuiz: (userId: string) => Promise<SubmitQuizResponse | null>;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quiz: null,
  answers: {},
  currentIndex: 0,
  isLoading: false,
  isSubmitting: false,
  error: null,
  result: null,

  loadQuiz: async (kuisId) => {
    set({ isLoading: true, error: null, result: null, answers: {}, currentIndex: 0 });
    try {
      const quiz = await apiClient.getQuiz(kuisId);
      set({ quiz, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal memuat kuis.',
      });
    }
  },

  selectAnswer: (soalId, pilihanIndex) => {
    set((state) => ({
      answers: {
        ...state.answers,
        [soalId]: pilihanIndex,
      },
    }));
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),

  submitQuiz: async (userId) => {
    const { quiz, answers } = get();
    if (!quiz) return null;

    set({ isSubmitting: true, error: null });
    try {
      const payload = Object.entries(answers).map(([soalId, pilihanIndex]) => ({
        soalId,
        pilihanIndex,
      }));
      const result = await apiClient.submitQuiz(quiz.id, userId, payload);
      set({ result, isSubmitting: false });
      return result;
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Gagal mengumpulkan jawaban kuis.',
      });
      return null;
    }
  },

  resetQuiz: () => set({ answers: {}, currentIndex: 0, result: null, error: null }),
}));
