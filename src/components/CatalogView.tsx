import { BookOpen, FileQuestion, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { Subject, TopicSummary } from '../shared/contracts';
import { useSessionStore } from '../stores/session-store';
import { MasteryIndicator } from './MasteryIndicator';

export function CatalogView() {
  const {
    activeUserId,
    catalogGradeFilter,
    catalogSubjectFilter,
    setCatalogFilters,
    navigate,
  } = useSessionStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getSubjects().then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .getTopics({
        kelas: catalogGradeFilter,
        mapel: catalogSubjectFilter,
        search,
        userId: activeUserId,
      })
      .then((list) => {
        if (!active) return;
        setTopics(list);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [catalogGradeFilter, catalogSubjectFilter, search, activeUserId]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-medium text-[#1D4ED8]">Katalog Kurikulum SMA</p>
        <h1 className="font-editorial text-3xl font-bold text-slate-900 mt-1">
          Daftar Mata Pelajaran & Bab Pembelajaran
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-[68ch]">
          Saring materi berdasarkan jenjang kelas 10–12 atau mata pelajaran. Setiap topik menyediakan ringkasan konsep, cheat sheet rumus, dan kuis latihan otomatis.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { label: 'Semua Kelas', value: null },
              { label: 'Kelas 10', value: 10 },
              { label: 'Kelas 11', value: 11 },
              { label: 'Kelas 12', value: 12 },
            ].map((item) => (
              <button
                key={String(item.value)}
                type="button"
                onClick={() => setCatalogFilters(item.value, catalogSubjectFilter)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  catalogGradeFilter === item.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter mata pelajaran"
            value={catalogSubjectFilter}
            onChange={(e) => setCatalogFilters(catalogGradeFilter, e.target.value)}
            className="text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-[#1D4ED8] cursor-pointer"
          >
            <option value="semua">Semua Mata Pelajaran</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul topik atau bab..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8]"
          />
        </div>
      </div>

      {/* Topic Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 bg-white border border-slate-200 rounded-xl p-6 animate-pulse" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900">
            Belum ada topik yang sesuai dengan filter Anda.
          </p>
          <p className="text-sm text-slate-600">
            Coba ubah jenjang kelas, mata pelajaran, atau kata kunci pencarian.
          </p>
          <button
            type="button"
            onClick={() => {
              setCatalogFilters(null, 'semua');
              setSearch('');
            }}
            className="mt-2 inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] cursor-pointer"
          >
            Tampilkan Semua Topik
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {topics.map((topic) => (
            <article
              key={topic.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>
                    Kelas {topic.kelas} · {topic.mapelNama} · {topic.bab}
                  </span>
                  <MasteryIndicator status={topic.masteryStatus} />
                </div>

                <h2 className="font-editorial text-xl font-bold text-slate-900 mt-3 leading-snug">
                  {topic.judul}
                </h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{topic.ringkasan}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-mono text-slate-500 tabular-nums">
                  {topic.durasiMenit} menit · {topic.jumlahSoal} butir soal
                  {topic.skorTerakhir !== null && topic.percobaan > 0
                    ? ` · Skor terakhir ${Math.round(topic.skorTerakhir)}`
                    : ''}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('learn', { topicId: topic.id })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pelajari</span>
                  </button>

                  {topic.kuisId && topic.jumlahSoal > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate('quiz', { quizId: topic.kuisId!, topicId: topic.id })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <FileQuestion className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Kuis</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
