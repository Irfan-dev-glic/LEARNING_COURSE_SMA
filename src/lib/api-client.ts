import type {
  CreateMateriBody,
  CreateSoalBody,
  LeaderboardEntry,
  ProgressSummary,
  QuizDetail,
  StreakStatus,
  Subject,
  SubmitQuizResponse,
  TopicDetail,
  TopicSummary,
  UserProfile,
} from '../shared/contracts';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = `Permintaan gagal (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) {
        message = errBody.error;
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  getUsers: () => request<UserProfile[]>('/api/users'),

  getSubjects: () => request<Subject[]>('/api/subjects'),

  getTopics: (params: { kelas?: number | null; mapel?: string; search?: string; userId: string }) => {
    const query = new URLSearchParams();
    query.set('userId', params.userId);
    if (params.kelas) query.set('kelas', String(params.kelas));
    if (params.mapel && params.mapel !== 'semua') query.set('mapel', params.mapel);
    if (params.search) query.set('search', params.search);
    return request<TopicSummary[]>(`/api/materi?${query.toString()}`);
  },

  getTopicDetail: (topikId: string, userId: string) =>
    request<TopicDetail>(`/api/materi/${encodeURIComponent(topikId)}?userId=${encodeURIComponent(userId)}`),

  completeTopic: (topikId: string, userId: string) =>
    request<{
      alreadyCompleted: boolean;
      xpGained: number;
      totalXp: number;
      newLevel: number;
      streakDays: number;
    }>(`/api/materi/${encodeURIComponent(topikId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getQuiz: (kuisId: string) => request<QuizDetail>(`/api/kuis/${encodeURIComponent(kuisId)}`),

  submitQuiz: (kuisId: string, userId: string, jawaban: Array<{ soalId: string; pilihanIndex: number }>) =>
    request<SubmitQuizResponse>(`/api/kuis/${encodeURIComponent(kuisId)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ userId, jawaban }),
    }),

  getProgress: (userId: string) =>
    request<ProgressSummary>(`/api/progres?userId=${encodeURIComponent(userId)}`),

  activateStreakFreeze: (userId: string) =>
    request<{ status: StreakStatus; used: boolean; message: string }>('/api/gamifikasi/streak/freeze', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getLeaderboard: (params: { kelas?: number | null; userId: string }) => {
    const query = new URLSearchParams();
    query.set('userId', params.userId);
    if (params.kelas) query.set('kelas', String(params.kelas));
    return request<{ minggu: string; entries: LeaderboardEntry[] }>(
      `/api/gamifikasi/leaderboard?${query.toString()}`
    );
  },

  setLeaderboardOptIn: (userId: string, optIn: boolean) =>
    request<{ userId: string; leaderboardOptIn: boolean }>('/api/gamifikasi/leaderboard/opt-in', {
      method: 'POST',
      body: JSON.stringify({ userId, optIn }),
    }),

  getGuruOverview: () =>
    request<{
      topics: Array<{
        id: string;
        mapelId: string;
        mapelNama: string;
        kelas: 10 | 11 | 12;
        bab: string;
        judul: string;
        durasiMenit: number;
        kuisId: string | null;
        kuisJudul: string | null;
        jumlahSoal: number;
        siswaMenguasai: number;
      }>;
      recentQuestions: Array<{
        id: string;
        kuisId: string;
        kuisJudul: string;
        pertanyaan: string;
        opsi: string[];
        kunciJawaban: number;
      }>;
    }>('/api/guru/overview'),

  createMateri: (payload: CreateMateriBody) =>
    request<{ topicId: string; quizId: string; judul: string }>('/api/guru/materi', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createSoal: (payload: CreateSoalBody) =>
    request<{ id: string; kuisId: string; urutan: number }>('/api/guru/soal', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
