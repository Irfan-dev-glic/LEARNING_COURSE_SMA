import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, FileQuestion, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { TopicDetail } from '../shared/contracts';
import { useSessionStore } from '../stores/session-store';
import { MasteryIndicator } from './MasteryIndicator';

export function LearnView() {
  const { selectedTopicId, activeUserId, navigate, showToast } = useSessionStore();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [openExampleIdx, setOpenExampleIdx] = useState<number | null>(0);

  const topicId = selectedTopicId ?? 'mtk-trigonometri';

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .getTopicDetail(topicId, activeUserId)
      .then((detail) => {
        if (!active) return;
        setTopic(detail);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [topicId, activeUserId]);

  const handleMarkComplete = async () => {
    if (!topic || completing) return;
    setCompleting(true);
    try {
      const res = await apiClient.completeTopic(topic.id, activeUserId);
      setTopic((prev) =>
        prev
          ? {
              ...prev,
              materiSelesai: true,
              masteryStatus: prev.masteryStatus === 'belum' ? 'sedang_belajar' : prev.masteryStatus,
            }
          : prev
      );
      if (res.alreadyCompleted) {
        showToast('Materi sudah tercatat selesai', `Streak harian Anda saat ini ${res.streakDays} hari.`, 'info');
      } else {
        showToast(
          `Materi Selesai (+${res.xpGained} XP)`,
          `Total ${res.totalXp} XP · Level ${res.newLevel} · Streak ${res.streakDays} hari.`,
          'success'
        );
      }
    } catch (err) {
      showToast('Gagal mencatat progres', err instanceof Error ? err.message : undefined, 'error');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="lg:col-span-4 h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
        <p className="text-lg font-semibold text-slate-900">Materi tidak ditemukan.</p>
        <button
          type="button"
          onClick={() => navigate('catalog')}
          className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg cursor-pointer"
        >
          Kembali ke Katalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('catalog')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            {topic.mapelNama} · Kelas {topic.kelas} · {topic.bab}
          </span>
          <MasteryIndicator status={topic.masteryStatus} />
        </div>
      </div>

      {/* Two-Zone Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Zone: Lesson Body & Worked Examples */}
        <div className="lg:col-span-8 space-y-6">
          <article className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <header className="border-b border-slate-200 pb-6">
              <p className="text-xs font-mono text-slate-500 tabular-nums">
                Estimasi baca {topic.durasiMenit} menit · {topic.jumlahSoal} soal evaluasi
              </p>
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-slate-900 mt-2 leading-tight text-balance">
                {topic.judul}
              </h1>
              <p className="text-base text-slate-600 mt-3 leading-relaxed">{topic.ringkasan}</p>
            </header>

            <div className="space-y-6">
              {topic.konten.map((section, idx) => (
                <section key={idx} className="space-y-2">
                  <h2 className="font-editorial text-xl font-semibold text-slate-900">
                    {String(idx + 1).padStart(2, '0')}. {section.subjudul}
                  </h2>
                  <p className="text-[15px] sm:text-base text-slate-700 leading-[1.7] max-w-[68ch]">
                    {section.isi}
                  </p>
                </section>
              ))}
            </div>

            {topic.contohSoal.length > 0 && (
              <section className="pt-6 border-t border-slate-200 space-y-4">
                <h2 className="font-editorial text-xl font-semibold text-slate-900">
                  Contoh Soal & Pembahasan Langkah demi Langkah
                </h2>

                {topic.contohSoal.map((ex, idx) => {
                  const isOpen = openExampleIdx === idx;
                  return (
                    <div key={idx} className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 space-y-3">
                      <p className="text-sm sm:text-base font-medium text-slate-900">{ex.soal}</p>

                      <button
                        type="button"
                        onClick={() => setOpenExampleIdx(isOpen ? null : idx)}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                      >
                        <span>{isOpen ? 'Sembunyikan Langkah' : 'Lihat Langkah Penyelesaian'}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isOpen && (
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700">
                            {ex.langkah.map((step, sIdx) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ol>
                          <p className="text-sm font-mono font-semibold text-[#059669] pt-1">
                            Jawaban Akhir: {ex.jawaban}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            <footer className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                disabled={completing}
                onClick={handleMarkComplete}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  topic.materiSelesai
                    ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/30'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {topic.materiSelesai
                    ? 'Materi Sudah Ditandai Selesai'
                    : completing
                      ? 'Menyimpan...'
                      : 'Tandai Materi Selesai (+50 XP)'}
                </span>
              </button>

              {topic.kuisId && topic.jumlahSoal > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('quiz', { quizId: topic.kuisId!, topicId: topic.id })}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors cursor-pointer"
                >
                  <FileQuestion className="w-4 h-4" />
                  <span>Lanjut ke Kuis ({topic.jumlahSoal} Soal)</span>
                </button>
              )}
            </footer>
          </article>
        </div>

        {/* Right Zone: Sticky Cheat Sheet & Concept Deck */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <p className="text-xs font-medium text-[#1D4ED8]">Ringkasan Cepat</p>
              <h2 className="font-editorial text-lg font-bold text-slate-900 mt-0.5">
                Cheat Sheet Rumus & Konsep
              </h2>
            </div>

            <div className="divide-y divide-slate-200">
              {topic.cheatSheet.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                  <p className="font-mono text-xs sm:text-sm font-medium text-slate-900 bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2">
                    {item.rumus}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.catatan}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
              <span>Siap Menguji Pemahaman?</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Raih skor minimal 75 pada kuis untuk menaikkan status penguasaan topik menjadi <strong className="text-[#059669]">Menguasai</strong> dan menambah XP mingguan kelas.
            </p>
            {topic.kuisId && topic.jumlahSoal > 0 ? (
              <button
                type="button"
                onClick={() => navigate('quiz', { quizId: topic.kuisId!, topicId: topic.id })}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors cursor-pointer"
              >
                Mulai Kuis Sekarang
              </button>
            ) : (
              <p className="text-xs text-slate-500">
                Belum ada soal untuk topik ini. Guru dapat menambahkannya di Portal Guru.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
