import { Award, Flame, ShieldCheck, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { LeaderboardEntry, ProgressSummary } from '../shared/contracts';
import { useSessionStore } from '../stores/session-store';
import { MasteryIndicator } from './MasteryIndicator';

export function DashboardView() {
  const { activeUserId, initUsers, navigate, showToast } = useSessionStore();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ minggu: string; entries: LeaderboardEntry[] }>({
    minggu: '',
    entries: [],
  });
  const [lbGradeFilter, setLbGradeFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [togglingOptIn, setTogglingOptIn] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prog, lb] = await Promise.all([
        apiClient.getProgress(activeUserId),
        apiClient.getLeaderboard({ kelas: lbGradeFilter, userId: activeUserId }),
      ]);
      setProgress(prog);
      setLeaderboard(lb);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, lbGradeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleActivateFreeze = async () => {
    if (freezing) return;
    setFreezing(true);
    try {
      const res = await apiClient.activateStreakFreeze(activeUserId);
      setProgress((prev) => (prev ? { ...prev, streak: res.status } : prev));
      showToast(res.used ? 'Streak Freeze Diaktifkan' : 'Informasi Streak', res.message, res.used ? 'success' : 'info');
    } catch (err) {
      showToast('Gagal mengaktifkan freeze', err instanceof Error ? err.message : undefined, 'error');
    } finally {
      setFreezing(false);
    }
  };

  const handleToggleOptIn = async () => {
    if (!progress || togglingOptIn) return;
    setTogglingOptIn(true);
    const nextOptIn = !progress.user.leaderboardOptIn;
    try {
      await apiClient.setLeaderboardOptIn(activeUserId, nextOptIn);
      await initUsers();
      await loadData();
      showToast(
        nextOptIn ? 'Ikut Peringkat Mingguan' : 'Keluar dari Peringkat Mingguan',
        nextOptIn
          ? 'Nama dan XP mingguan Anda kini tampil di papan peringkat kelas.'
          : 'Profil Anda disembunyikan dari papan peringkat kelas.',
        'info'
      );
    } catch (err) {
      showToast('Gagal mengubah preferensi', err instanceof Error ? err.message : undefined, 'error');
    } finally {
      setTogglingOptIn(false);
    }
  };

  if (loading && !progress) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const masteredCount = progress.masteryList.filter((m) => m.masteryStatus === 'menguasai').length;
  const recommendedTopics = progress.masteryList
    .filter((m) => m.masteryStatus !== 'menguasai')
    .slice(0, 4);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#1D4ED8]">
            Dasbor Pelajar · {progress.user.kelasLabel}
          </p>
          <h1 className="font-editorial text-3xl font-bold text-slate-900 mt-1">
            Selamat Belajar, {progress.user.nama}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('progress')}
          className="text-sm font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
        >
          Lihat Peta Penguasaan & Riwayat XP →
        </button>
      </div>

      {/* Top 3 Gamification Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* XP & Level */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Level & Pengalaman</p>
            <span className="font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums">
              Level {progress.level}
            </span>
          </div>
          <div>
            <p className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {progress.totalXp} XP
            </p>
            <div className="mt-3 space-y-1.5">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1D4ED8] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((progress.xpIntoLevel / progress.xpForNextLevel) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-xs font-mono text-slate-500 tabular-nums">
                {progress.xpIntoLevel} / {progress.xpForNextLevel} XP menuju Level {progress.level + 1}
              </p>
            </div>
          </div>
        </section>

        {/* Streak & Freeze */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Streak Belajar Harian</p>
              <span className="text-xs font-medium text-slate-600">
                {progress.streak.aktifHariIni ? 'Tercatat hari ini' : 'Belum belajar hari ini'}
              </span>
            </div>
            <p className="font-mono text-3xl font-bold text-[#D97706] tabular-nums mt-2 flex items-center gap-2">
              <Flame className="w-6 h-6" aria-hidden="true" />
              <span>{progress.streak.jumlahHari} Hari</span>
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-slate-600 tabular-nums">
              Freeze tersisa: {progress.streak.freezeSisa}/2
            </span>
            <button
              type="button"
              disabled={freezing || progress.streak.aktifHariIni || progress.streak.freezeSisa <= 0}
              onClick={handleActivateFreeze}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1D4ED8]" aria-hidden="true" />
              <span>{freezing ? 'Memproses...' : 'Pakai Freeze'}</span>
            </button>
          </div>
        </section>

        {/* Mastery & Badges Snapshot */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Penguasaan Kurikulum</p>
            <p className="font-mono text-3xl font-bold text-[#059669] tabular-nums mt-2">
              {masteredCount} / {progress.masteryList.length} Topik
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Status Menguasai diraih dengan skor kuis minimal 75.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Award className="w-4 h-4 text-[#D97706]" aria-hidden="true" />
              <span>
                {progress.badges.filter((b) => b.earned).length} dari {progress.badges.length} Lencana
              </span>
            </span>
            <button
              type="button"
              onClick={() => navigate('progress')}
              className="font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              Lihat Lencana
            </button>
          </div>
        </section>
      </div>

      {/* Main Split: Recommended Next Topics & Weekly Class Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Recommended Topics & Subject XP */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="font-editorial text-xl font-bold text-slate-900">
                Lanjutkan Pembelajaran
              </h2>
              <button
                type="button"
                onClick={() => navigate('catalog')}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
              >
                Semua Topik →
              </button>
            </div>

            {recommendedTopics.length === 0 ? (
              <p className="text-sm text-slate-600 py-4">
                Luar biasa! Anda telah menguasai seluruh topik yang tersedia saat ini.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {recommendedTopics.map((topic) => (
                  <div key={topic.id} className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>
                          Kelas {topic.kelas} · {topic.mapelNama}
                        </span>
                        <MasteryIndicator status={topic.masteryStatus} />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                        {topic.judul}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate('learn', { topicId: topic.id })}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        Pelajari
                      </button>
                      {topic.kuisId && topic.jumlahSoal > 0 && (
                        <button
                          type="button"
                          onClick={() => navigate('quiz', { quizId: topic.kuisId!, topicId: topic.id })}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] cursor-pointer"
                        >
                          Kuis
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-editorial text-xl font-bold text-slate-900 border-b border-slate-200 pb-3">
              XP per Mata Pelajaran
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {progress.xpPerMapel.map((m) => (
                <div key={m.mapelId} className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{m.mapelNama}</span>
                    <span className="font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums">
                      Lv. {m.level}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 tabular-nums">
                    <span>{m.xp} XP</span>
                    <span>
                      {m.topikMenguasai}/{m.totalTopik} dikuasai
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Opt-In Weekly Leaderboard */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#D97706]" aria-hidden="true" />
                <h2 className="font-editorial text-xl font-bold text-slate-900">
                  Papan Peringkat Mingguan
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                Periode mulai {leaderboard.minggu || 'minggu ini'} · Bersifat Opt-In
              </p>
            </div>

            {progress.user.role === 'siswa' && (
              <button
                type="button"
                disabled={togglingOptIn}
                onClick={handleToggleOptIn}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  progress.user.leaderboardOptIn
                    ? 'border-[#059669]/40 bg-[#059669]/10 text-[#065F46]'
                    : 'border-slate-200 bg-[#F8FAFC] text-slate-700 hover:bg-slate-100'
                }`}
              >
                {progress.user.leaderboardOptIn ? 'Ikut Peringkat: Aktif' : 'Ikut Peringkat: Nonaktif'}
              </button>
            )}
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { label: 'Semua', val: null },
              { label: 'Kelas 10', val: 10 },
              { label: 'Kelas 11', val: 11 },
              { label: 'Kelas 12', val: 12 },
            ].map((item) => (
              <button
                key={String(item.val)}
                type="button"
                onClick={() => setLbGradeFilter(item.val)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  lbGradeFilter === item.val
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {leaderboard.entries.length === 0 ? (
            <p className="text-sm text-slate-600 py-6 text-center">
              Belum ada peserta opt-in untuk filter kelas ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 text-left font-medium">#</th>
                    <th className="py-2 text-left font-medium">Siswa</th>
                    <th className="py-2 text-right font-medium">Streak</th>
                    <th className="py-2 text-right font-medium">XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.entries.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={entry.isCurrentUser ? 'bg-[#1D4ED8]/6 font-semibold' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 pr-2 font-mono text-xs text-slate-500 tabular-nums">
                        {entry.rank}
                      </td>
                      <td className="py-3">
                        <p className="text-slate-900">
                          {entry.nama}
                          {entry.isCurrentUser && <span className="ml-1.5 text-xs text-[#1D4ED8]">(Anda)</span>}
                        </p>
                        <p className="text-xs text-slate-500 font-normal">
                          {entry.kelasLabel} · Level {entry.level}
                        </p>
                      </td>
                      <td className="py-3 text-right font-mono text-xs text-[#D97706] tabular-nums">
                        {entry.streakHari} hr
                      </td>
                      <td className="py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {entry.xpMingguan}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
