import crypto from 'crypto';
import { db, getMondayDateISO } from '../db.ts';
import type { XpEventType } from '../../src/shared/contracts.ts';

export const XP_PER_LEVEL = 150;

export function computeLevel(totalXp: number) {
  const safeXp = Math.max(0, totalXp);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = safeXp % XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
  };
}

export function getUserTotalXp(userId: string): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(jumlah), 0) as total FROM xp_events WHERE user_id = ?')
    .get(userId) as { total: number };
  return row.total;
}

export function recordXpEvent(params: {
  userId: string;
  mapelId: string;
  jenis: XpEventType;
  jumlah: number;
}) {
  const { userId, mapelId, jenis, jumlah } = params;
  const now = new Date().toISOString();
  const id = `xp-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO xp_events (id, user_id, mapel_id, jenis, jumlah, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, mapelId, jenis, jumlah, now);

  // Update weekly leaderboard snapshot
  const user = db
    .prepare('SELECT kelas FROM users WHERE id = ?')
    .get(userId) as { kelas: number } | undefined;

  if (user) {
    const monday = getMondayDateISO();
    const existing = db
      .prepare('SELECT xp FROM leaderboard_weekly WHERE minggu = ? AND user_id = ?')
      .get(monday, userId) as { xp: number } | undefined;

    if (existing) {
      db.prepare('UPDATE leaderboard_weekly SET xp = xp + ? WHERE minggu = ? AND user_id = ?')
        .run(jumlah, monday, userId);
    } else {
      db.prepare('INSERT INTO leaderboard_weekly (minggu, user_id, kelas_id, xp) VALUES (?, ?, ?, ?)')
        .run(monday, userId, String(user.kelas), jumlah);
    }
  }

  const totalXp = getUserTotalXp(userId);
  const { level } = computeLevel(totalXp);

  return {
    xpGained: jumlah,
    totalXp,
    newLevel: level,
  };
}
