import { create } from 'zustand';
import { apiClient } from '../lib/api-client';
import type { UserProfile } from '../shared/contracts';

export type AppRoute = 'home' | 'catalog' | 'learn' | 'quiz' | 'dashboard' | 'progress' | 'guru';

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone: 'success' | 'info' | 'error';
}

interface SessionState {
  users: UserProfile[];
  activeUserId: string;
  route: AppRoute;
  selectedTopicId: string | null;
  selectedQuizId: string | null;
  catalogGradeFilter: number | null;
  catalogSubjectFilter: string;
  toast: ToastMessage | null;
  isLoadingUsers: boolean;

  initUsers: () => Promise<void>;
  setActiveUserId: (userId: string) => void;
  navigate: (route: AppRoute, opts?: { topicId?: string; quizId?: string; kelas?: number | null; mapel?: string }) => void;
  setCatalogFilters: (kelas: number | null, mapel: string) => void;
  showToast: (title: string, detail?: string, tone?: ToastMessage['tone']) => void;
  dismissToast: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  users: [],
  activeUserId: 'siswa-10-nadia',
  route: 'home',
  selectedTopicId: 'mtk-trigonometri',
  selectedQuizId: 'kuis-mtk-trigonometri',
  catalogGradeFilter: null,
  catalogSubjectFilter: 'semua',
  toast: null,
  isLoadingUsers: false,

  initUsers: async () => {
    set({ isLoadingUsers: true });
    try {
      const users = await apiClient.getUsers();
      const current = get().activeUserId;
      const valid = users.some((u) => u.id === current) ? current : (users[0]?.id ?? 'siswa-10-nadia');
      set({ users, activeUserId: valid, isLoadingUsers: false });
    } catch {
      set({ isLoadingUsers: false });
    }
  },

  setActiveUserId: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    set({ activeUserId: userId });
    if (user?.role === 'guru') {
      set({ route: 'guru' });
    } else if (get().route === 'guru') {
      set({ route: 'dashboard' });
    }
  },

  navigate: (route, opts) => {
    set((state) => ({
      route,
      selectedTopicId: opts?.topicId !== undefined ? opts.topicId : state.selectedTopicId,
      selectedQuizId: opts?.quizId !== undefined ? opts.quizId : state.selectedQuizId,
      catalogGradeFilter: opts?.kelas !== undefined ? opts.kelas : state.catalogGradeFilter,
      catalogSubjectFilter: opts?.mapel !== undefined ? opts.mapel : state.catalogSubjectFilter,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setCatalogFilters: (kelas, mapel) => set({ catalogGradeFilter: kelas, catalogSubjectFilter: mapel }),

  showToast: (title, detail, tone = 'success') => {
    const id = `${Date.now()}`;
    set({ toast: { id, title, detail, tone } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 4500);
  },

  dismissToast: () => set({ toast: null }),
}));
