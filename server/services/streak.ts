import { db } from '../db.ts';
import type { StreakStatus } from '../../src/shared/contracts.ts';

function toDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateISO(d);
}

export function getStreakStatus(userId: string): StreakStatus {
  const today = toDateISO(new Date());
  const row = db
    .prepare('SELECT user_id, hari_terakhir, jumlah_hari, freeze_sisa FROM streak WHERE user_id = ?')
    .get(userId) as
    | { user_id: string; hari_terakhir: string | null; jumlah_hari: number; freeze_sisa: number }
    | undefined;

  if (!row) {
    db.prepare('INSERT INTO streak (user_id, hari_terakhir, jumlah_hari, freeze_sisa) VALUES (?, NULL, 0, 2)').run(userId);
    return {
      userId,
      hariTerakhir: null,
      jumlahHari: 0,
      freezeSisa: 2,
      aktifHariIni: false,
    };
  }

  return {
    userId: row.user_id,
    hariTerakhir: row.hari_terakhir,
    jumlahHari: row.jumlah_hari,
    freezeSisa: row.freeze_sisa,
    aktifHariIni: row.hari_terakhir === today,
  };
}

export function touchDailyStreak(userId: string): StreakStatus {
  const today = toDateISO(new Date());
  const yesterday = addDaysISO(today, -1);
  const twoDaysAgo = addDaysISO(today, -2);
  const current = getStreakStatus(userId);

  if (current.hariTerakhir === today) {
    return current;
  }

  let nextDays = 1;
  let nextFreeze = current.freezeSisa;

  if (current.hariTerakhir === yesterday) {
    nextDays = current.jumlahHari + 1;
  } else if (current.hariTerakhir === twoDaysAgo && current.freezeSisa > 0) {
    nextDays = current.jumlahHari + 1;
    nextFreeze = current.freezeSisa - 1;
  }

  db.prepare(`
    UPDATE streak
    SET hari_terakhir = ?, jumlah_hari = ?, freeze_sisa = ?
    WHERE user_id = ?
  `).run(today, nextDays, nextFreeze, userId);

  return {
    userId,
    hariTerakhir: today,
    jumlahHari: nextDays,
    freezeSisa: nextFreeze,
    aktifHariIni: true,
  };
}

export function activateStreakFreeze(userId: string): { status: StreakStatus; used: boolean; message: string } {
  const today = toDateISO(new Date());
  const current = getStreakStatus(userId);

  if (current.aktifHariIni) {
    return {
      status: current,
      used: false,
      message: 'Aktivitas belajar hari ini sudah tercatat sehingga streak Anda sudah aman.',
    };
  }

  if (current.freezeSisa <= 0) {
    return {
      status: current,
      used: false,
      message: 'Cadangan Streak Freeze Anda sudah habis untuk periode ini.',
    };
  }

  const nextFreeze = current.freezeSisa - 1;
  db.prepare(`
    UPDATE streak
    SET hari_terakhir = ?, freeze_sisa = ?
    WHERE user_id = ?
  `).run(today, nextFreeze, userId);

  return {
    status: {
      userId,
      hariTerakhir: today,
      jumlahHari: current.jumlahHari,
      freezeSisa: nextFreeze,
      aktifHariIni: true,
    },
    used: true,
    message: `Streak Freeze diaktifkan. Streak ${current.jumlahHari} hari Anda terlindungi hari ini.`,
  };
}
