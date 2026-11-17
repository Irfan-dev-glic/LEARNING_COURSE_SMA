import { UserCheck } from 'lucide-react';
import { useSessionStore } from '../stores/session-store';

export function WorkspaceToolbar() {
  const { users, activeUserId, setActiveUserId, route, navigate } = useSessionStore();
  const activeUser = users.find((u) => u.id === activeUserId);

  if (users.length === 0) return null;

  const studentUsers = users.filter((u) => u.role === 'siswa');
  const teacherUser = users.find((u) => u.role === 'guru');

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
          <UserCheck className="w-4 h-4 text-[#1D4ED8] shrink-0" />
          <span className="font-medium text-slate-900">Profil Aktif:</span>
          <span className="text-slate-600 truncate max-w-[220px] sm:max-w-none">
            {activeUser ? `${activeUser.nama} · ${activeUser.kelasLabel}` : 'Memuat profil...'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="profile-switcher" className="sr-only">
            Pilih profil pengguna
          </label>
          <select
            id="profile-switcher"
            value={activeUserId}
            onChange={(e) => setActiveUserId(e.target.value)}
            className="text-xs sm:text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-[#1D4ED8] cursor-pointer"
          >
            <optgroup label="Siswa SMA">
              {studentUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nama} ({u.kelasLabel})
                </option>
              ))}
            </optgroup>
            {teacherUser && (
              <optgroup label="Pengajar">
                <option value={teacherUser.id}>{teacherUser.nama} (Guru)</option>
              </optgroup>
            )}
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                if (activeUser?.role === 'guru' && studentUsers[0]) {
                  setActiveUserId(studentUsers[0].id);
                }
                navigate(route === 'guru' ? 'dashboard' : route);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route !== 'guru'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Siswa
            </button>
            <button
              type="button"
              onClick={() => {
                if (teacherUser && activeUser?.role !== 'guru') {
                  setActiveUserId(teacherUser.id);
                } else {
                  navigate('guru');
                }
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'guru'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Guru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
