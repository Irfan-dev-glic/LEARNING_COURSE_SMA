import { ArrowRight, BookOpen, CheckSquare, Flame, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { ProgressSummary, Subject, TopicSummary } from '../shared/contracts';
import { useSessionStore } from '../stores/session-store';
import { MasteryIndicator } from './MasteryIndicator';

export function HomeView() {
  const { activeUserId, navigate } = useSessionStore();
  const [selectedGrade, setSelectedGrade] = useState<10 | 11 | 12>(10);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      apiClient.getTopics({ userId: activeUserId }),
      apiClient.getSubjects(),
      apiClient.getProgress(activeUserId),
    ])
      .then(([topicList, subjectList, prog]) => {
        if (!active) return;
        setTopics(topicList);
        setSubjects(subjectList);
        setProgress(prog);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUserId]);

  const gradeTopics = topics.filter((t) => t.kelas === selectedGrade);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
      {/* Split Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-7 sm:p-10">
          <div className="space-y-5">
            <p className="text-xs sm:text-sm font-medium text-[#1D4ED8] tracking-wide">
              Kurikulum SMA Terpadu · Kelas 10, 11, dan 12
            </p>
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-slate-900 leading-[1.15] text-balance">
              Materi Ringkas, Latihan Kuis Terukur, dan Progres Belajar yang Terpantau.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-[60ch]">
              Pelajari konsep inti Matematika, IPA, dan Bahasa dengan panduan cheat sheet rumus, contoh soal langkah demi langkah, serta evaluasi kuis berhadiah XP dan pencatatan streak harian.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('catalog')}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors cursor-pointer"
            >
              <span>Jelajahi Katalog Mapel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('dashboard')}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>Buka Dasbor Progres</span>
            </button>
          </div>
        </div>

        {/* Right Hero Column: Live Student Snapshot */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs font-medium text-slate-500">Ringkasan Pelajar Aktif</p>
                <h2 className="font-editorial text-xl font-semibold text-slate-900 mt-0.5">
                  {progress ? progress.user.nama : 'Memuat data...'}
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-[#1D4ED8] tabular-nums">
                Level {progress?.level ?? 1}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Total Perolehan XP</p>
                <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                  {progress?.totalXp ?? 0} XP
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Streak Harian</p>
                <p className="font-mono text-2xl font-semibold text-[#D97706] tabular-nums mt-1 flex items-center gap-1.5">
                  <Flame className="w-5 h-5" aria-hidden="true" />
                  <span>{progress?.streak.jumlahHari ?? 0} Hari</span>
                </p>
              </div>
            </div>

            <div className="pt-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Menuju Level {(progress?.level ?? 1) + 1}</span>
                <span className="font-mono tabular-nums">
                  {progress?.xpIntoLevel ?? 0} / {progress?.xpForNextLevel ?? 150} XP
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1D4ED8] rounded-full transition-all duration-300"
                  style={{
                    width: `${progress ? Math.min(100, Math.round((progress.xpIntoLevel / progress.xpForNextLevel) * 100)) : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Cadangan Streak Freeze tersisa: <strong className="text-slate-800 font-mono tabular-nums">{progress?.streak.freezeSisa ?? 2}</strong> dari 2
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Status: {progress?.streak.aktifHariIni ? 'Aktif belajar hari ini' : 'Belum belajar hari ini'}</span>
            <button
              type="button"
              onClick={() => navigate('progress')}
              className="font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              Detail Peta Penguasaan →
            </button>
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <BookOpen className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
            <span>Mata Pelajaran</span>
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {subjects.length || 6} Mapel
          </p>
          <p className="text-xs text-slate-500 mt-1">MIPA & Bahasa SMA</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Layers className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
            <span>Topik Tersedia</span>
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {topics.length} Topik
          </p>
          <p className="text-xs text-slate-500 mt-1">Dilengkapi cheat sheet rumus</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <CheckSquare className="w-4 h-4 text-[#059669]" aria-hidden="true" />
            <span>Topik Dikuasai</span>
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {progress ? progress.masteryList.filter((m) => m.masteryStatus === 'menguasai').length : 0} Topik
          </p>
          <p className="text-xs text-slate-500 mt-1">Skor minimal 75 pada kuis</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Flame className="w-4 h-4 text-[#D97706]" aria-hidden="true" />
            <span>Lencana Terbuka</span>
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {progress ? progress.badges.filter((b) => b.earned).length : 0} / {progress?.badges.length ?? 5}
          </p>
          <p className="text-xs text-slate-500 mt-1">Pencapaian otomatis di server</p>
        </div>
      </section>

      {/* Interactive Grade Curriculum Preview */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-slate-900">
              Kurikulum Berdasarkan Jenjang Kelas
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Pilih tingkat kelas untuk langsung membuka materi dan latihan soal terkait.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
            {([10, 11, 12] as const).map((kelas) => (
              <button
                key={kelas}
                type="button"
                onClick={() => setSelectedGrade(kelas)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedGrade === kelas
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kelas {kelas}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-44 bg-white border border-slate-200 rounded-xl p-6 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {gradeTopics.map((topic) => (
              <article
                key={topic.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {topic.mapelNama} · Kelas {topic.kelas}
                    </span>
                    <MasteryIndicator status={topic.masteryStatus} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mt-3 leading-snug">
                    {topic.judul}
                  </h3>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{topic.ringkasan}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {topic.durasiMenit} mnt · {topic.jumlahSoal} soal
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('learn', { topicId: topic.id })}
                    className="text-sm font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Pelajari →
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
