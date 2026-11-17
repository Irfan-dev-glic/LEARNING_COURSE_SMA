import { BookPlus, HelpCircle, PlusCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '../lib/api-client';
import type { Subject } from '../shared/contracts';
import { useSessionStore } from '../stores/session-store';

export function GuruView() {
  const { navigate, showToast } = useSessionStore();
  const [activeTab, setActiveTab] = useState<'materi' | 'soal'>('materi');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<
    Array<{
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
    }>
  >([]);
  const [recentQuestions, setRecentQuestions] = useState<
    Array<{
      id: string;
      kuisId: string;
      kuisJudul: string;
      pertanyaan: string;
      opsi: string[];
      kunciJawaban: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  // Form Materi State
  const [mapelId, setMapelId] = useState('matematika');
  const [kelas, setKelas] = useState<number>(10);
  const [bab, setBab] = useState('');
  const [judul, setJudul] = useState('');
  const [ringkasan, setRingkasan] = useState('');
  const [isiMateri, setIsiMateri] = useState('');
  const [rumusKunci, setRumusKunci] = useState('');
  const [catatanKunci, setCatatanKunci] = useState('');
  const [durasiMenit, setDurasiMenit] = useState(15);
  const [submittingMateri, setSubmittingMateri] = useState(false);

  // Form Soal State
  const [kuisId, setKuisId] = useState('');
  const [pertanyaan, setPertanyaan] = useState('');
  const [opsiA, setOpsiA] = useState('');
  const [opsiB, setOpsiB] = useState('');
  const [opsiC, setOpsiC] = useState('');
  const [opsiD, setOpsiD] = useState('');
  const [kunciJawaban, setKunciJawaban] = useState(0);
  const [pembahasan, setPembahasan] = useState('');
  const [submittingSoal, setSubmittingSoal] = useState(false);

  const loadGuruData = async () => {
    setLoading(true);
    try {
      const [subList, overview] = await Promise.all([
        apiClient.getSubjects(),
        apiClient.getGuruOverview(),
      ]);
      setSubjects(subList);
      setTopics(overview.topics);
      setRecentQuestions(overview.recentQuestions);
      if (!kuisId && overview.topics[0]?.kuisId) {
        setKuisId(overview.topics[0].kuisId);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuruData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateMateri = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingMateri(true);
    try {
      const res = await apiClient.createMateri({
        mapelId,
        kelas: kelas as 10 | 11 | 12,
        bab,
        judul,
        ringkasan,
        isiMateri,
        rumusKunci,
        catatanKunci,
        durasiMenit,
      });
      showToast('Materi Berhasil Diterbitkan', `Topik "${res.judul}" kini tersedia di Katalog Siswa.`, 'success');
      setBab('');
      setJudul('');
      setRingkasan('');
      setIsiMateri('');
      setRumusKunci('');
      setCatatanKunci('');
      setKuisId(res.quizId);
      await loadGuruData();
    } catch (err) {
      showToast('Validasi Materi Gagal', err instanceof Error ? err.message : undefined, 'error');
    } finally {
      setSubmittingMateri(false);
    }
  };

  const handleCreateSoal = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingSoal(true);
    try {
      const res = await apiClient.createSoal({
        kuisId,
        pertanyaan,
        opsiA,
        opsiB,
        opsiC,
        opsiD,
        kunciJawaban,
        pembahasan,
      });
      showToast('Soal Kuis Ditambahkan', `Butir soal ke-${res.urutan} berhasil disimpan ke bank soal.`, 'success');
      setPertanyaan('');
      setOpsiA('');
      setOpsiB('');
      setOpsiC('');
      setOpsiD('');
      setPembahasan('');
      await loadGuruData();
    } catch (err) {
      showToast('Validasi Soal Gagal', err instanceof Error ? err.message : undefined, 'error');
    } finally {
      setSubmittingSoal(false);
    }
  };

  const availableQuizzes = topics.filter((t) => t.kuisId !== null);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#1D4ED8]">Portal Pengajar SMA</p>
          <h1 className="font-editorial text-3xl font-bold text-slate-900 mt-1">
            Kelola Materi Pembelajaran & Bank Soal Kuis
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Materi dan soal yang diterbitkan langsung tersimpan ke database dan muncul pada katalog siswa.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('materi')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'materi'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookPlus className="w-4 h-4" aria-hidden="true" />
            <span>Kelola Materi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('soal')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'soal'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            <span>Bank Soal Kuis</span>
          </button>
        </div>
      </div>

      {activeTab === 'materi' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Create Materi Form */}
          <form
            onSubmit={handleCreateMateri}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-editorial text-xl font-bold text-slate-900 border-b border-slate-200 pb-3">
              Terbitkan Topik Materi Baru
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                <select
                  value={mapelId}
                  onChange={(e) => setMapelId(e.target.value)}
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenjang Kelas</label>
                <select
                  value={kelas}
                  onChange={(e) => setKelas(Number(e.target.value))}
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                >
                  <option value={10}>Kelas 10</option>
                  <option value={11}>Kelas 11</option>
                  <option value={12}>Kelas 12</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bab</label>
                <input
                  type="text"
                  required
                  value={bab}
                  onChange={(e) => setBab(e.target.value)}
                  placeholder="Contoh: Bab 4 · Matriks"
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi (mnt)</label>
                <input
                  type="number"
                  min={5}
                  max={90}
                  required
                  value={durasiMenit}
                  onChange={(e) => setDurasiMenit(Number(e.target.value))}
                  className="w-full text-sm font-mono bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Topik</label>
              <input
                type="text"
                required
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Determinan & Invers Matriks 2x2"
                className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ringkasan Singkat</label>
              <input
                type="text"
                required
                value={ringkasan}
                onChange={(e) => setRingkasan(e.target.value)}
                placeholder="Deskripsi tujuan belajar untuk katalog..."
                className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Penjelasan Materi Lengkap</label>
              <textarea
                rows={4}
                required
                value={isiMateri}
                onChange={(e) => setIsiMateri(e.target.value)}
                placeholder="Tuliskan konsep utama dan penjelasan materi (pisahkan paragraf dengan baris kosong)..."
                className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rumus / Poin Cheat Sheet</label>
                <input
                  type="text"
                  required
                  value={rumusKunci}
                  onChange={(e) => setRumusKunci(e.target.value)}
                  placeholder="det(A) = ad - bc"
                  className="w-full text-sm font-mono bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Konsep</label>
                <input
                  type="text"
                  required
                  value={catatanKunci}
                  onChange={(e) => setCatatanKunci(e.target.value)}
                  placeholder="Syarat invers: det(A) ≠ 0"
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingMateri}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submittingMateri ? 'Menerbitkan...' : 'Terbitkan Materi & Buat Kuis'}</span>
            </button>
          </form>

          {/* Existing Topics Table */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="font-editorial text-xl font-bold text-slate-900">
                Daftar Materi Terbit ({topics.length})
              </h2>
            </div>

            {loading ? (
              <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 text-left font-medium">Topik</th>
                      <th className="py-2 text-left font-medium">Mapel · Kelas</th>
                      <th className="py-2 text-right font-medium">Soal</th>
                      <th className="py-2 text-right font-medium">Menguasai</th>
                      <th className="py-2 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topics.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-slate-900">{t.judul}</p>
                          <p className="text-xs text-slate-500">{t.bab}</p>
                        </td>
                        <td className="py-3 pr-3 text-xs text-slate-600 whitespace-nowrap">
                          {t.mapelNama} · Kls {t.kelas}
                        </td>
                        <td className="py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {t.jumlahSoal}
                        </td>
                        <td className="py-3 text-right font-mono text-xs text-[#059669] tabular-nums">
                          {t.siswaMenguasai} siswa
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => navigate('learn', { topicId: t.id })}
                            className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                          >
                            Pratinjau
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Create Soal Form */}
          <form
            onSubmit={handleCreateSoal}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-editorial text-xl font-bold text-slate-900 border-b border-slate-200 pb-3">
              Tambah Butir Soal Kuis
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kuis Tujuan</label>
              <select
                value={kuisId}
                onChange={(e) => setKuisId(e.target.value)}
                required
                className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              >
                {availableQuizzes.map((t) => (
                  <option key={t.kuisId!} value={t.kuisId!}>
                    {t.mapelNama} Kls {t.kelas} — {t.judul} ({t.jumlahSoal} soal)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pertanyaan</label>
              <textarea
                rows={3}
                required
                value={pertanyaan}
                onChange={(e) => setPertanyaan(e.target.value)}
                placeholder="Tuliskan teks pertanyaan kuis..."
                className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opsi A</label>
                <input
                  type="text"
                  required
                  value={opsiA}
                  onChange={(e) => setOpsiA(e.target.value)}
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opsi B</label>
                <input
                  type="text"
                  required
                  value={opsiB}
                  onChange={(e) => setOpsiB(e.target.value)}
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opsi C</label>
                <input
                  type="text"
                  required
                  value={opsiC}
                  onChange={(e) => setOpsiC(e.target.value)}
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opsi D</label>
                <input
                  type="text"
                  required
                  value={opsiD}
                  onChange={(e) => setOpsiD(e.target.value)}
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kunci Jawaban</label>
              <select
                value={kunciJawaban}
                onChange={(e) => setKunciJawaban(Number(e.target.value))}
                className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
              >
                <option value={0}>Opsi A</option>
                <option value={1}>Opsi B</option>
                <option value={2}>Opsi C</option>
                <option value={3}>Opsi D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pembahasan Jawaban</label>
              <textarea
                rows={2}
                required
                value={pembahasan}
                onChange={(e) => setPembahasan(e.target.value)}
                placeholder="Penjelasan langkah mengapa kunci jawaban benar..."
                className="w-full text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={submittingSoal || !kuisId}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submittingSoal ? 'Menyimpan Soal...' : 'Simpan ke Bank Soal'}</span>
            </button>
          </form>

          {/* Recent Questions List */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-editorial text-xl font-bold text-slate-900 border-b border-slate-200 pb-3">
              Daftar Soal Terbaru ({recentQuestions.length})
            </h2>

            <div className="divide-y divide-slate-200">
              {recentQuestions.map((q) => (
                <article key={q.id} className="py-4 first:pt-1 last:pb-1 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{q.kuisJudul}</span>
                    <span className="font-mono font-semibold text-[#059669]">
                      Kunci: {['A', 'B', 'C', 'D'][q.kunciJawaban]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{q.pertanyaan}</p>
                  <p className="text-xs text-slate-600">
                    Opsi: {q.opsi.map((o, idx) => `${['A', 'B', 'C', 'D'][idx]}. ${o}`).join(' · ')}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
