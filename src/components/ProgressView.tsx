import { Award, CheckCircle2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { MasteryStatus, ProgressSummary, XpEventType } from '../shared/contracts';
import { useSessionStore } from '../stores/session-store';
import { MasteryIndicator } from './MasteryIndicator';

const EVENT_LABELS: Record<XpEventType, string> = {
  materi_selesai: 'Materi Selesai',
  kuis_selesai: 'Kuis Selesai',
  jawaban_benar: 'Jawaban Benar',
  tryout: 'Tryout',
};

export function ProgressView() {
  const { activeUserId, navigate } = useSessionStore();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<'semua' | MasteryStatus>('semua');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .getProgress(activeUserId)
      .then((res) => {
        if (!active) return;
        setProgress(res);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUserId]);

  if (loading && !progress) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!progress) return null;

  const filteredMastery =
    statusFilter === 'semua'
      ? progress.masteryList
      : progress.masteryList.filter((m) => m.masteryStatus === statusFilter);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-medium text-[#1D4ED8]">
          Rekap Penguasaan & Audit Aktivitas · {progress.user.nama}
        </p>
        <h1 className="font-editorial text-3xl font-bold text-slate-900 mt-1">
          Peta Penguasaan Topik, Lencana & Log XP
        </h1>
      </div>

      {/* Mastery Table */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-editorial text-xl font-bold text-slate-900">
              Peta Penguasaan Topik Kurikulum
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Menampilkan status penguasaan, skor kuis terakhir, dan jumlah percobaan tiap topik.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {[
              { key: 'semua', label: 'Semua' },
              { key: 'menguasai', label: 'Menguasai' },
              { key: 'sedang_belajar', label: 'Sedang Belajar' },
              { key: 'belum', label: 'Belum' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key as 'semua' | MasteryStatus)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === item.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filteredMastery.length === 0 ? (
          <p className="text-sm text-slate-600 py-6 text-center">
            Tidak ada topik dengan status penguasaan yang dipilih.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 text-left font-medium">Topik Pembelajaran</th>
                  <th className="py-2.5 text-left font-medium">Mapel & Kelas</th>
                  <th className="py-2.5 text-left font-medium">Status</th>
                  <th className="py-2.5 text-right font-medium">Skor Terakhir</th>
                  <th className="py-2.5 text-right font-medium">Percobaan</th>
                  <th className="py-2.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMastery.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-900">{m.judul}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600 whitespace-nowrap">
                      {m.mapelNama} · Kelas {m.kelas}
                    </td>
                    <td className="py-3 pr-4">
                      <MasteryIndicator status={m.masteryStatus} />
                    </td>
                    <td className="py-3 text-right font-mono text-xs text-slate-900 tabular-nums">
                      {m.skorTerakhir !== null && m.percobaan > 0 ? `${Math.round(m.skorTerakhir)}/100` : '—'}
                    </td>
                    <td className="py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {m.percobaan}x
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate('learn', { topicId: m.id })}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                      >
                        Buka Materi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Badges & Append-Only XP Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D97706]" aria-hidden="true" />
              <h2 className="font-editorial text-xl font-bold text-slate-900">Koleksi Lencana</h2>
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {progress.badges.filter((b) => b.earned).length}/{progress.badges.length} terbuka
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {progress.badges.map((badge) => (
              <div key={badge.id} className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {badge.earned ? (
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" aria-hidden="true" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    )}
                    <h3 className={`text-sm font-semibold ${badge.earned ? 'text-slate-900' : 'text-slate-500'}`}>
                      {badge.nama}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 pl-6">{badge.deskripsi}</p>
                </div>

                <span className="text-xs font-mono text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                  {badge.earned && badge.earnedAt ? badge.earnedAt.slice(0, 10) : 'Terkunci'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="font-editorial text-xl font-bold text-slate-900">
              Riwayat Perolehan XP (Append-Only)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan historis aktivitas penyelesaian materi dan kuis dari tabel xp_events.
            </p>
          </div>

          {progress.recentXpEvents.length === 0 ? (
            <p className="text-sm text-slate-600 py-6 text-center">
              Belum ada aktivitas XP tercatat untuk profil ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 text-left font-medium">Aktivitas</th>
                    <th className="py-2 text-left font-medium">Mapel</th>
                    <th className="py-2 text-right font-medium">XP</th>
                    <th className="py-2 text-right font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {progress.recentXpEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50">
                      <td className="py-2.5 text-slate-900 font-medium">
                        {EVENT_LABELS[ev.jenis] ?? ev.jenis}
                      </td>
                      <td className="py-2.5 text-xs text-slate-600">{ev.mapelNama}</td>
                      <td className="py-2.5 text-right font-mono text-xs font-semibold text-[#059669] tabular-nums">
                        +{ev.jumlah}
                      </td>
                      <td className="py-2.5 text-right font-mono text-xs text-slate-500 tabular-nums">
                        {ev.createdAt.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
