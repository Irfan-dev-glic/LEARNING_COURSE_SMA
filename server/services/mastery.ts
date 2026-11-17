import { db } from '../db.ts';
import type { BadgeInfo, MasteryStatus } from '../../src/shared/contracts.ts';
import { getStreakStatus } from './streak.ts';

export function updateTopicMastery(params: {
  userId: string;
  topikId: string;
  skor: number;
}): {
  topikId: string;
  status: MasteryStatus;
  skorTerakhir: number;
  percobaan: number;
} {
  const { userId, topikId, skor } = params;
  const existing = db
    .prepare('SELECT status, percobaan FROM mastery WHERE user_id = ? AND topik_id = ?')
    .get(userId, topikId) as { status: MasteryStatus; percobaan: number } | undefined;

  const computedStatus: MasteryStatus =
    skor >= 75 || existing?.status === 'menguasai' ? 'menguasai' : 'sedang_belajar';
  const nextAttempts = (existing?.percobaan ?? 0) + 1;

  if (existing) {
    db.prepare(`
      UPDATE mastery
      SET status = ?, skor_terakhir = ?, percobaan = ?
      WHERE user_id = ? AND topik_id = ?
    `).run(computedStatus, skor, nextAttempts, userId, topikId);
  } else {
    db.prepare(`
      INSERT INTO mastery (user_id, topik_id, status, skor_terakhir, percobaan)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, topikId, computedStatus, skor, nextAttempts);
  }

  return {
    topikId,
    status: computedStatus,
    skorTerakhir: skor,
    percobaan: nextAttempts,
  };
}

export function getUserBadges(userId: string): BadgeInfo[] {
  const rows = db
    .prepare(`
      SELECT b.id, b.nama, b.deskripsi, b.kategori, ub.earned_at
      FROM badges b
      LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = ?
      ORDER BY CASE WHEN ub.earned_at IS NOT NULL THEN 0 ELSE 1 END, b.nama ASC
    `)
    .all(userId) as Array<{
    id: string;
    nama: string;
    deskripsi: string;
    kategori: string;
    earned_at: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    deskripsi: r.deskripsi,
    kategori: r.kategori,
    earned: Boolean(r.earned_at),
    earnedAt: r.earned_at,
  }));
}

export function evaluateAndUnlockBadges(userId: string, latestScore?: number): BadgeInfo[] {
  const now = new Date().toISOString();
  const alreadyEarned = new Set(
    (
      db
        .prepare('SELECT badge_id FROM user_badges WHERE user_id = ?')
        .all(userId) as Array<{ badge_id: string }>
    ).map((r) => r.badge_id)
  );

  const completedTopicsCount = (
    db.prepare('SELECT COUNT(*) as c FROM topic_completions WHERE user_id = ?').get(userId) as { c: number }
  ).c;

  const masteredCount = (
    db
      .prepare("SELECT COUNT(*) as c FROM mastery WHERE user_id = ? AND status = 'menguasai'")
      .get(userId) as { c: number }
  ).c;

  const quizDoneCount = (
    db.prepare('SELECT COUNT(*) as c FROM mastery WHERE user_id = ? AND percobaan > 0').get(userId) as { c: number }
  ).c;

  const streak = getStreakStatus(userId);

  const toUnlock: string[] = [];
  if (!alreadyEarned.has('langkah-pertama') && (completedTopicsCount >= 1 || quizDoneCount >= 1)) {
    toUnlock.push('langkah-pertama');
  }
  if (!alreadyEarned.has('penakluk-kuis') && latestScore !== undefined && latestScore >= 80) {
    toUnlock.push('penakluk-kuis');
  }
  if (!alreadyEarned.has('ahli-materi') && masteredCount >= 3) {
    toUnlock.push('ahli-materi');
  }
  if (!alreadyEarned.has('api-konsisten') && streak.jumlahHari >= 5) {
    toUnlock.push('api-konsisten');
  }
  if (!alreadyEarned.has('nilai-sempurna') && latestScore === 100) {
    toUnlock.push('nilai-sempurna');
  }

  if (toUnlock.length === 0) {
    return [];
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO user_badges (user_id, badge_id, earned_at)
    VALUES (?, ?, ?)
  `);

  for (const badgeId of toUnlock) {
    insertStmt.run(userId, badgeId, now);
  }

  const unlockedSet = new Set(toUnlock);
  return getUserBadges(userId).filter((b) => unlockedSet.has(b.id));
}
