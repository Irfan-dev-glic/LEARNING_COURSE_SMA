import { ArrowLeft, Award, CheckCircle2, Flame, RotateCcw, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useQuizStore } from '../stores/quiz-store';
import { useSessionStore } from '../stores/session-store';
import { MasteryIndicator } from './MasteryIndicator';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function QuizView() {
  const { selectedQuizId, selectedTopicId, activeUserId, navigate, showToast } = useSessionStore();
  const {
    quiz,
    answers,
    currentIndex,
    isLoading,
    isSubmitting,
    error,
    result,
    loadQuiz,
    selectAnswer,
    setCurrentIndex,
    submitQuiz,
    resetQuiz,
  } = useQuizStore();

  const kuisId = selectedQuizId ?? 'kuis-mtk-trigonometri';

  useEffect(() => {
    loadQuiz(kuisId);
  }, [kuisId, loadQuiz]);

  const handleSubmit = async () => {
    const res = await submitQuiz(activeUserId);
    if (res) {
      showToast(
        `Kuis Selesai · Skor ${res.skor}`,
        `+${res.xpGained} XP diraih · Level ${res.newLevel} · Streak ${res.streakDays} hari.`,
        'success'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />
        <div className="h-80 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center space-y-4">
        <p className="text-lg font-semibold text-slate-900">{error ?? 'Kuis tidak tersedia.'}</p>
        <button
          type="button"
          onClick={() => navigate('catalog')}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg cursor-pointer"
        >
          Kembali ke Katalog
        </button>
      </div>
    );
  }

  if (quiz.soal.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center space-y-4 bg-white border border-slate-200 rounded-2xl mt-8">
        <p className="text-lg font-semibold text-slate-900">Kuis ini belum memiliki butir soal.</p>
        <p className="text-sm text-slate-600">
          Guru dapat menambahkan soal baru ke kuis ini melalui menu Portal Guru.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('learn', { topicId: quiz.topikId })}
            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
          >
            Kembali ke Materi
          </button>
          <button
            type="button"
            onClick={() => navigate('guru')}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg cursor-pointer"
          >
            Buka Portal Guru
          </button>
        </div>
      </div>
    );
  }

  // Post-submit results & detailed review
  if (result) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="text-xs font-medium text-[#1D4ED8]">
                Hasil Evaluasi · {quiz.mapelNama} Kelas {quiz.kelas}
              </p>
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                {quiz.judul}
              </h1>
            </div>
            <MasteryIndicator status={result.mastery.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Skor Akhir</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {result.skor} / 100
              </p>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                {result.benar} benar · {result.salah} salah
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Tambahan XP</p>
              <p className="font-mono text-2xl font-bold text-[#1D4ED8] tabular-nums mt-1">
                +{result.xpGained} XP
              </p>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                Total {result.totalXp} XP
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Level Pelajar</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                Level {result.newLevel}
              </p>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                Percobaan ke-{result.mastery.percobaan}
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Streak Harian</p>
              <p className="font-mono text-2xl font-bold text-[#D97706] tabular-nums mt-1 flex items-center gap-1.5">
                <Flame className="w-5 h-5" aria-hidden="true" />
                <span>{result.streakDays} Hari</span>
              </p>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                Freeze tersisa: {result.freezeSisa}
              </p>
            </div>
          </div>

          {result.unlockedBadges.length > 0 && (
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Award className="w-4 h-4 text-[#D97706]" />
                <span>Lencana Baru Terbuka!</span>
              </div>
              <div className="space-y-1">
                {result.unlockedBadges.map((b) => (
                  <p key={b.id} className="text-sm text-slate-700">
                    <strong>{b.nama}</strong> — {b.deskripsi}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetQuiz}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ulangi Kuis</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('learn', { topicId: selectedTopicId ?? quiz.topikId })}
              className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Kembali ke Materi
            </button>
            <button
              type="button"
              onClick={() => navigate('dashboard')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] cursor-pointer"
            >
              Lihat Dasbor Progres
            </button>
          </div>
        </div>

        {/* Question-by-Question Review */}
        <section className="space-y-4">
          <h2 className="font-editorial text-2xl font-bold text-slate-900">
            Pembahasan Setiap Butir Soal
          </h2>
          {result.pembahasan.map((item, idx) => (
            <article key={item.soalId} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm sm:text-base font-semibold text-slate-900">
                  {idx + 1}. {item.pertanyaan}
                </p>
                {item.benar ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] whitespace-nowrap shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Benar</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#DC2626] whitespace-nowrap shrink-0">
                    <XCircle className="w-4 h-4" />
                    <span>Kurang Tepat</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                {item.opsi.map((opt, optIdx) => {
                  const isCorrectOpt = optIdx === item.kunciJawaban;
                  const isUserChoice = optIdx === item.pilihanUser;
                  let style = 'border-slate-200 bg-[#F8FAFC] text-slate-700';
                  if (isCorrectOpt) {
                    style = 'border-[#059669] bg-[#059669]/10 text-[#065F46] font-semibold';
                  } else if (isUserChoice && !item.benar) {
                    style = 'border-[#DC2626] bg-[#DC2626]/10 text-[#991B1B]';
                  }
                  return (
                    <div key={optIdx} className={`border rounded-lg px-3.5 py-2.5 ${style}`}>
                      <span className="font-mono mr-2">{OPTION_LETTERS[optIdx]}.</span>
                      <span>{opt}</span>
                      {isCorrectOpt && <span className="ml-2 text-xs">(Kunci)</span>}
                      {isUserChoice && !isCorrectOpt && <span className="ml-2 text-xs">(Pilihan Anda)</span>}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Pembahasan: </strong>
                {item.pembahasan}
              </div>
            </article>
          ))}
        </section>
      </div>
    );
  }

  // Active Quiz Session
  const activeQuestion = quiz.soal[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const selectedOption = activeQuestion ? answers[activeQuestion.id] : undefined;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('learn', { topicId: quiz.topikId })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Materi</span>
        </button>

        <p className="text-xs font-mono text-slate-500 tabular-nums">
          {quiz.mapelNama} · Kelas {quiz.kelas} · {answeredCount} / {quiz.soal.length} terjawab
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Question Card */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#1D4ED8]">{quiz.judul}</p>
              <p className="text-xs font-mono text-slate-500 tabular-nums mt-1">
                Soal {currentIndex + 1} dari {quiz.soal.length}
              </p>
            </div>
          </div>

          {activeQuestion && (
            <div className="space-y-5">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 leading-relaxed">
                {activeQuestion.pertanyaan}
              </h1>

              <div className="space-y-3" role="radiogroup" aria-label={`Pilihan jawaban soal ${currentIndex + 1}`}>
                {activeQuestion.opsi.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectAnswer(activeQuestion.id, idx)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-[#1D4ED8] bg-[#1D4ED8]/8 text-slate-900 font-medium'
                          : 'border-slate-200 bg-[#F8FAFC] text-slate-800 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-md font-mono text-xs font-semibold flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#1D4ED8] text-white' : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        {OPTION_LETTERS[idx]}
                      </span>
                      <span className="text-sm sm:text-base pt-0.5">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={currentIndex >= quiz.soal.length - 1}
                onClick={() => setCurrentIndex(Math.min(quiz.soal.length - 1, currentIndex + 1))}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmitting || answeredCount === 0}
              onClick={handleSubmit}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Menilai Jawaban...' : `Kumpulkan Jawaban (${answeredCount}/${quiz.soal.length})`}
            </button>
          </div>
        </div>

        {/* Right Question Navigator */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="font-editorial text-lg font-bold text-slate-900">Navigasi Nomor Soal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Jawaban sementara tersimpan otomatis selama sesi kuis berlangsung.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {quiz.soal.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-lg font-mono text-sm font-semibold tabular-nums border transition-colors cursor-pointer ${
                    isCurrent
                      ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white'
                      : isAnswered
                        ? 'border-[#059669]/40 bg-[#059669]/10 text-[#065F46]'
                        : 'border-slate-200 bg-[#F8FAFC] text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
            <p>Aturan Penilaian & Gamifikasi:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>+40 XP penyelesaian kuis + 20 XP tiap jawaban benar</li>
              <li>Skor ≥ 75 meningkatkan status menjadi Menguasai</li>
              <li>Otomatis memperbarui streak belajar harian Anda</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
