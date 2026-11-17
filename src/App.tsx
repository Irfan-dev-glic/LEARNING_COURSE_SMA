import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { CatalogView } from './components/CatalogView';
import { DashboardView } from './components/DashboardView';
import { GuruView } from './components/GuruView';
import { HomeView } from './components/HomeView';
import { LearnView } from './components/LearnView';
import { ProgressView } from './components/ProgressView';
import { QuizView } from './components/QuizView';
import { TopBar } from './components/TopBar';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { useSessionStore } from './stores/session-store';

export default function App() {
  const { route, initUsers, toast, dismissToast, navigate } = useSessionStore();

  useEffect(() => {
    initUsers();
  }, [initUsers]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <TopBar />
      <WorkspaceToolbar />

      <main className="flex-1">
        {route === 'home' && <HomeView />}
        {route === 'catalog' && <CatalogView />}
        {route === 'learn' && <LearnView />}
        {route === 'quiz' && <QuizView />}
        {route === 'dashboard' && <DashboardView />}
        {route === 'progress' && <ProgressView />}
        {route === 'guru' && <GuruView />}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CendekiaSMA · Platform E-Learning SMA Kelas 10–12</p>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => navigate('catalog')} className="hover:text-slate-900 cursor-pointer">
              Katalog Mapel
            </button>
            <button type="button" onClick={() => navigate('dashboard')} className="hover:text-slate-900 cursor-pointer">
              Dasbor Siswa
            </button>
            <button type="button" onClick={() => navigate('guru')} className="hover:text-slate-900 cursor-pointer">
              Portal Guru
            </button>
            <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-slate-900">
              Referensi API
            </a>
          </div>
        </div>
      </footer>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex items-start gap-3"
        >
          {toast.tone === 'success' && <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />}
          {toast.tone === 'info' && <Info className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />}
          {toast.tone === 'error' && <XCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
            {toast.detail && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.detail}</p>}
          </div>

          <button
            type="button"
            onClick={dismissToast}
            aria-label="Tutup notifikasi"
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
