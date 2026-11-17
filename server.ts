import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, getMondayDateISO } from './server/db.ts';
import { computeLevel, getUserTotalXp, recordXpEvent } from './server/services/xp.ts';
import { activateStreakFreeze, getStreakStatus, touchDailyStreak } from './server/services/streak.ts';
import { evaluateAndUnlockBadges, getUserBadges, updateTopicMastery } from './server/services/mastery.ts';
import {
  CreateMateriBodySchema,
  CreateSoalBodySchema,
  SubmitQuizBodySchema,
  type MasteryStatus,
} from './src/shared/contracts.ts';

initDatabase();

const app = express();
app.use(express.json());

// 1. Users & Profiles
app.get('/api/users', (_req, res) => {
  const rows = db
    .prepare('SELECT id, nama, email, role, kelas, kelas_label, leaderboard_opt_in FROM users ORDER BY role DESC, kelas ASC, nama ASC')
    .all() as Array<{
    id: string;
    nama: string;
    email: string;
    role: 'siswa' | 'guru';
    kelas: 10 | 11 | 12;
    kelas_label: string;
    leaderboard_opt_in: number;
  }>;

  res.json(
    rows.map((u) => ({
      id: u.id,
      nama: u.nama,
      email: u.email,
      role: u.role,
      kelas: u.kelas,
      kelasLabel: u.kelas_label,
      leaderboardOptIn: Boolean(u.leaderboard_opt_in),
    }))
  );
});

// 2. Subjects & Curriculum Catalog
app.get('/api/subjects', (_req, res) => {
  const rows = db.prepare('SELECT id, nama, slug, deskripsi, kelompok FROM subjects ORDER BY nama ASC').all();
  res.json(rows);
});

app.get('/api/materi', (req, res) => {
  const kelasParam = req.query.kelas ? Number(req.query.kelas) : null;
  const mapelParam = typeof req.query.mapel === 'string' ? req.query.mapel : null;
  const searchParam = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const userId = typeof req.query.userId === 'string' ? req.query.userId : 'siswa-10-nadia';

  let sql = `
    SELECT
      t.id,
      t.mapel_id as mapelId,
      s.nama as mapelNama,
      s.slug as mapelSlug,
      t.kelas,
      t.bab,
      t.judul,
      t.ringkasan,
      t.durasi_menit as durasiMenit,
      q.id as kuisId,
      (SELECT COUNT(*) FROM questions qn WHERE qn.kuis_id = q.id) as jumlahSoal,
      COALESCE(m.status, 'belum') as masteryStatus,
      m.skor_terakhir as skorTerakhir,
      COALESCE(m.percobaan, 0) as percobaan
    FROM topics t
    JOIN subjects s ON s.id = t.mapel_id
    LEFT JOIN quizzes q ON q.topik_id = t.id
    LEFT JOIN mastery m ON m.topik_id = t.id AND m.user_id = ?
    WHERE 1=1
  `;

  const params: Array<string | number> = [userId];

  if (kelasParam && [10, 11, 12].includes(kelasParam)) {
    sql += ' AND t.kelas = ?';
    params.push(kelasParam);
  }
  if (mapelParam && mapelParam !== 'semua') {
    sql += ' AND t.mapel_id = ?';
    params.push(mapelParam);
  }

  sql += ' ORDER BY t.kelas ASC, s.nama ASC, t.bab ASC';

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    mapelId: string;
    mapelNama: string;
    mapelSlug: string;
    kelas: 10 | 11 | 12;
    bab: string;
    judul: string;
    ringkasan: string;
    durasiMenit: number;
    kuisId: string | null;
    jumlahSoal: number;
    masteryStatus: MasteryStatus;
    skorTerakhir: number | null;
    percobaan: number;
  }>;

  const filtered = searchParam
    ? rows.filter(
        (r) =>
          r.judul.toLowerCase().includes(searchParam) ||
          r.bab.toLowerCase().includes(searchParam) ||
          r.mapelNama.toLowerCase().includes(searchParam) ||
          r.ringkasan.toLowerCase().includes(searchParam)
      )
    : rows;

  res.json(filtered);
});

app.get('/api/materi/:topikId', (req, res) => {
  const { topikId } = req.params;
  const userId = typeof req.query.userId === 'string' ? req.query.userId : 'siswa-10-nadia';

  const row = db
    .prepare(`
      SELECT
        t.id,
        t.mapel_id as mapelId,
        s.nama as mapelNama,
        s.slug as mapelSlug,
        t.kelas,
        t.bab,
        t.judul,
        t.ringkasan,
        t.durasi_menit as durasiMenit,
        t.konten_json as kontenJson,
        t.cheat_sheet_json as cheatSheetJson,
        t.contoh_soal_json as contohSoalJson,
        q.id as kuisId,
        (SELECT COUNT(*) FROM questions qn WHERE qn.kuis_id = q.id) as jumlahSoal,
        COALESCE(m.status, 'belum') as masteryStatus,
        m.skor_terakhir as skorTerakhir,
        COALESCE(m.percobaan, 0) as percobaan,
        CASE WHEN tc.topik_id IS NOT NULL THEN 1 ELSE 0 END as materiSelesai
      FROM topics t
      JOIN subjects s ON s.id = t.mapel_id
      LEFT JOIN quizzes q ON q.topik_id = t.id
      LEFT JOIN mastery m ON m.topik_id = t.id AND m.user_id = ?
      LEFT JOIN topic_completions tc ON tc.topik_id = t.id AND tc.user_id = ?
      WHERE t.id = ?
    `)
    .get(userId, userId, topikId) as
    | {
        id: string;
        mapelId: string;
        mapelNama: string;
        mapelSlug: string;
        kelas: 10 | 11 | 12;
        bab: string;
        judul: string;
        ringkasan: string;
        durasiMenit: number;
        kontenJson: string;
        cheatSheetJson: string;
        contohSoalJson: string;
        kuisId: string | null;
        jumlahSoal: number;
        masteryStatus: MasteryStatus;
        skorTerakhir: number | null;
        percobaan: number;
        materiSelesai: number;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'Topik pembelajaran tidak ditemukan.' });
    return;
  }

  res.json({
    id: row.id,
    mapelId: row.mapelId,
    mapelNama: row.mapelNama,
    mapelSlug: row.mapelSlug,
    kelas: row.kelas,
    bab: row.bab,
    judul: row.judul,
    ringkasan: row.ringkasan,
    durasiMenit: row.durasiMenit,
    kuisId: row.kuisId,
    jumlahSoal: row.jumlahSoal,
    masteryStatus: row.masteryStatus,
    skorTerakhir: row.skorTerakhir,
    percobaan: row.percobaan,
    konten: JSON.parse(row.kontenJson),
    cheatSheet: JSON.parse(row.cheatSheetJson),
    contohSoal: JSON.parse(row.contohSoalJson),
    materiSelesai: Boolean(row.materiSelesai),
  });
});

app.post('/api/materi/:topikId/complete', (req, res) => {
  const { topikId } = req.params;
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';

  if (!userId) {
    res.status(400).json({ error: 'userId wajib disertakan.' });
    return;
  }

  const topic = db.prepare('SELECT id, mapel_id FROM topics WHERE id = ?').get(topikId) as
    | { id: string; mapel_id: string }
    | undefined;

  if (!topic) {
    res.status(404).json({ error: 'Topik tidak ditemukan.' });
    return;
  }

  const already = db
    .prepare('SELECT 1 FROM topic_completions WHERE user_id = ? AND topik_id = ?')
    .get(userId, topikId);

  const streak = touchDailyStreak(userId);
  let xpResult = { xpGained: 0, totalXp: getUserTotalXp(userId), newLevel: 1 };
  xpResult.newLevel = computeLevel(xpResult.totalXp).level;

  if (!already) {
    db.prepare('INSERT INTO topic_completions (user_id, topik_id, completed_at) VALUES (?, ?, ?)').run(
      userId,
      topikId,
      new Date().toISOString()
    );
    xpResult = recordXpEvent({
      userId,
      mapelId: topic.mapel_id,
      jenis: 'materi_selesai',
      jumlah: 50,
    });

    // If mastery doesn't exist yet, mark as sedang_belajar
    const masteryRow = db
      .prepare('SELECT status FROM mastery WHERE user_id = ? AND topik_id = ?')
      .get(userId, topikId);
    if (!masteryRow) {
      db.prepare(`
        INSERT INTO mastery (user_id, topik_id, status, skor_terakhir, percobaan)
        VALUES (?, ?, 'sedang_belajar', 0, 0)
      `).run(userId, topikId);
    }
  }

  const unlockedBadges = evaluateAndUnlockBadges(userId);

  res.json({
    alreadyCompleted: Boolean(already),
    xpGained: xpResult.xpGained,
    totalXp: xpResult.totalXp,
    newLevel: xpResult.newLevel,
    streakDays: streak.jumlahHari,
    unlockedBadges,
  });
});

// 3. Quiz Endpoints (No answer keys leaked in GET)
app.get('/api/kuis/:kuisId', (req, res) => {
  const { kuisId } = req.params;
  const quiz = db
    .prepare(`
      SELECT q.id, q.topik_id as topikId, q.judul, q.durasi_menit as durasiMenit,
             t.mapel_id as mapelId, s.nama as mapelNama, t.kelas
      FROM quizzes q
      JOIN topics t ON t.id = q.topik_id
      JOIN subjects s ON s.id = t.mapel_id
      WHERE q.id = ?
    `)
    .get(kuisId) as
    | {
        id: string;
        topikId: string;
        judul: string;
        durasiMenit: number;
        mapelId: string;
        mapelNama: string;
        kelas: 10 | 11 | 12;
      }
    | undefined;

  if (!quiz) {
    res.status(404).json({ error: 'Kuis tidak ditemukan.' });
    return;
  }

  const questions = db
    .prepare('SELECT id, pertanyaan, opsi_json, urutan FROM questions WHERE kuis_id = ? ORDER BY urutan ASC')
    .all(kuisId) as Array<{ id: string; pertanyaan: string; opsi_json: string; urutan: number }>;

  res.json({
    ...quiz,
    soal: questions.map((q) => ({
      id: q.id,
      pertanyaan: q.pertanyaan,
      opsi: JSON.parse(q.opsi_json),
      urutan: q.urutan,
    })),
  });
});

app.post('/api/kuis/:kuisId/submit', (req, res) => {
  const { kuisId } = req.params;
  const parsed = SubmitQuizBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Format jawaban kuis tidak valid.', issues: parsed.error.issues });
    return;
  }

  const { userId, jawaban } = parsed.data;
  const quiz = db
    .prepare(`
      SELECT q.id, q.topik_id as topikId, t.mapel_id as mapelId
      FROM quizzes q
      JOIN topics t ON t.id = q.topik_id
      WHERE q.id = ?
    `)
    .get(kuisId) as { id: string; topikId: string; mapelId: string } | undefined;

  if (!quiz) {
    res.status(404).json({ error: 'Kuis tidak ditemukan.' });
    return;
  }

  const questions = db
    .prepare('SELECT id, pertanyaan, opsi_json, kunci_jawaban, pembahasan FROM questions WHERE kuis_id = ? ORDER BY urutan ASC')
    .all(kuisId) as Array<{
    id: string;
    pertanyaan: string;
    opsi_json: string;
    kunci_jawaban: number;
    pembahasan: string;
  }>;

  if (questions.length === 0) {
    res.status(400).json({ error: 'Kuis belum memiliki butir soal.' });
    return;
  }

  const answerMap = new Map(jawaban.map((j) => [j.soalId, j.pilihanIndex]));
  let benar = 0;

  const pembahasan = questions.map((q) => {
    const pilihanUser = answerMap.has(q.id) ? (answerMap.get(q.id) ?? null) : null;
    const isCorrect = pilihanUser === q.kunci_jawaban;
    if (isCorrect) {
      benar += 1;
    }
    return {
      soalId: q.id,
      pertanyaan: q.pertanyaan,
      opsi: JSON.parse(q.opsi_json) as string[],
      pilihanUser,
      kunciJawaban: q.kunci_jawaban,
      benar: isCorrect,
      pembahasan: q.pembahasan,
    };
  });

  const totalSoal = questions.length;
  const salah = totalSoal - benar;
  const skor = Math.round((benar / totalSoal) * 100);

  // Gamification services execution inside transaction
  const result = db.transaction(() => {
    const baseQuizXp = 40;
    const correctAnswerXp = benar * 20;
    const totalXpAwarded = baseQuizXp + correctAnswerXp;

    const xpRes = recordXpEvent({
      userId,
      mapelId: quiz.mapelId,
      jenis: 'kuis_selesai',
      jumlah: totalXpAwarded,
    });

    const streak = touchDailyStreak(userId);
    const mastery = updateTopicMastery({
      userId,
      topikId: quiz.topikId,
      skor,
    });
    const unlockedBadges = evaluateAndUnlockBadges(userId, skor);

    return {
      skor,
      benar,
      salah,
      totalSoal,
      xpGained: xpRes.xpGained,
      totalXp: xpRes.totalXp,
      newLevel: xpRes.newLevel,
      streakDays: streak.jumlahHari,
      freezeSisa: streak.freezeSisa,
      mastery,
      unlockedBadges,
      pembahasan,
    };
  })();

  res.json(result);
});

// 4. Progress & Gamification Endpoints
app.get('/api/progres', (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : 'siswa-10-nadia';
  const userRow = db
    .prepare('SELECT id, nama, email, role, kelas, kelas_label, leaderboard_opt_in FROM users WHERE id = ?')
    .get(userId) as
    | {
        id: string;
        nama: string;
        email: string;
        role: 'siswa' | 'guru';
        kelas: 10 | 11 | 12;
        kelas_label: string;
        leaderboard_opt_in: number;
      }
    | undefined;

  if (!userRow) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    return;
  }

  const totalXp = getUserTotalXp(userId);
  const { level, xpIntoLevel, xpForNextLevel } = computeLevel(totalXp);
  const streak = getStreakStatus(userId);

  const xpPerMapel = db
    .prepare(`
      SELECT
        s.id as mapelId,
        s.nama as mapelNama,
        COALESCE((SELECT SUM(x.jumlah) FROM xp_events x WHERE x.user_id = ? AND x.mapel_id = s.id), 0) as xp,
        (SELECT COUNT(*) FROM topics t WHERE t.mapel_id = s.id) as totalTopik,
        (SELECT COUNT(*) FROM mastery m JOIN topics t ON t.id = m.topik_id WHERE m.user_id = ? AND t.mapel_id = s.id AND m.status = 'menguasai') as topikMenguasai
      FROM subjects s
      ORDER BY s.nama ASC
    `)
    .all(userId, userId) as Array<{
    mapelId: string;
    mapelNama: string;
    xp: number;
    totalTopik: number;
    topikMenguasai: number;
  }>;

  const masteryList = db
    .prepare(`
      SELECT
        t.id,
        t.mapel_id as mapelId,
        s.nama as mapelNama,
        s.slug as mapelSlug,
        t.kelas,
        t.bab,
        t.judul,
        t.ringkasan,
        t.durasi_menit as durasiMenit,
        q.id as kuisId,
        (SELECT COUNT(*) FROM questions qn WHERE qn.kuis_id = q.id) as jumlahSoal,
        COALESCE(m.status, 'belum') as masteryStatus,
        m.skor_terakhir as skorTerakhir,
        COALESCE(m.percobaan, 0) as percobaan
      FROM topics t
      JOIN subjects s ON s.id = t.mapel_id
      LEFT JOIN quizzes q ON q.topik_id = t.id
      LEFT JOIN mastery m ON m.topik_id = t.id AND m.user_id = ?
      ORDER BY t.kelas ASC, s.nama ASC
    `)
    .all(userId);

  const recentXpEvents = db
    .prepare(`
      SELECT x.id, x.mapel_id as mapelId, s.nama as mapelNama, x.jenis, x.jumlah, x.created_at as createdAt
      FROM xp_events x
      JOIN subjects s ON s.id = x.mapel_id
      WHERE x.user_id = ?
      ORDER BY x.created_at DESC
      LIMIT 15
    `)
    .all(userId);

  const badges = getUserBadges(userId);

  res.json({
    user: {
      id: userRow.id,
      nama: userRow.nama,
      email: userRow.email,
      role: userRow.role,
      kelas: userRow.kelas,
      kelasLabel: userRow.kelas_label,
      leaderboardOptIn: Boolean(userRow.leaderboard_opt_in),
    },
    totalXp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    streak,
    xpPerMapel: xpPerMapel.map((m) => ({
      ...m,
      level: computeLevel(m.xp).level,
    })),
    masteryList,
    badges,
    recentXpEvents,
  });
});

app.get('/api/gamifikasi/streak', (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : 'siswa-10-nadia';
  res.json(getStreakStatus(userId));
});

app.post('/api/gamifikasi/streak/freeze', (req, res) => {
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
  if (!userId) {
    res.status(400).json({ error: 'userId wajib diisi.' });
    return;
  }
  const result = activateStreakFreeze(userId);
  res.json(result);
});

app.get('/api/gamifikasi/leaderboard', (req, res) => {
  const kelasFilter = req.query.kelas ? String(req.query.kelas) : null;
  const currentUserId = typeof req.query.userId === 'string' ? req.query.userId : 'siswa-10-nadia';
  const monday = getMondayDateISO();

  let sql = `
    SELECT
      u.id as userId,
      u.nama,
      u.kelas,
      u.kelas_label as kelasLabel,
      COALESCE(lw.xp, 0) as xpMingguan,
      COALESCE(st.jumlah_hari, 0) as streakHari
    FROM users u
    LEFT JOIN leaderboard_weekly lw ON lw.user_id = u.id AND lw.minggu = ?
    LEFT JOIN streak st ON st.user_id = u.id
    WHERE u.role = 'siswa' AND u.leaderboard_opt_in = 1
  `;

  const params: Array<string | number> = [monday];
  if (kelasFilter && ['10', '11', '12'].includes(kelasFilter)) {
    sql += ' AND u.kelas = ?';
    params.push(Number(kelasFilter));
  }

  sql += ' ORDER BY xpMingguan DESC, streakHari DESC, u.nama ASC';

  const rows = db.prepare(sql).all(...params) as Array<{
    userId: string;
    nama: string;
    kelas: 10 | 11 | 12;
    kelasLabel: string;
    xpMingguan: number;
    streakHari: number;
  }>;

  const entries = rows.map((r, idx) => {
    const totalXp = getUserTotalXp(r.userId);
    return {
      rank: idx + 1,
      userId: r.userId,
      nama: r.nama,
      kelas: r.kelas,
      kelasLabel: r.kelasLabel,
      xpMingguan: r.xpMingguan,
      level: computeLevel(totalXp).level,
      streakHari: r.streakHari,
      isCurrentUser: r.userId === currentUserId,
    };
  });

  res.json({ minggu: monday, entries });
});

app.post('/api/gamifikasi/leaderboard/opt-in', (req, res) => {
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
  const optIn = Boolean(req.body?.optIn);
  if (!userId) {
    res.status(400).json({ error: 'userId wajib diisi.' });
    return;
  }

  db.prepare('UPDATE users SET leaderboard_opt_in = ? WHERE id = ?').run(optIn ? 1 : 0, userId);
  res.json({ userId, leaderboardOptIn: optIn });
});

// 5. Guru Portal Endpoints
app.get('/api/guru/overview', (_req, res) => {
  const topics = db
    .prepare(`
      SELECT
        t.id,
        t.mapel_id as mapelId,
        s.nama as mapelNama,
        t.kelas,
        t.bab,
        t.judul,
        t.durasi_menit as durasiMenit,
        q.id as kuisId,
        q.judul as kuisJudul,
        (SELECT COUNT(*) FROM questions qn WHERE qn.kuis_id = q.id) as jumlahSoal,
        (SELECT COUNT(*) FROM mastery m WHERE m.topik_id = t.id AND m.status = 'menguasai') as siswaMenguasai
      FROM topics t
      JOIN subjects s ON s.id = t.mapel_id
      LEFT JOIN quizzes q ON q.topik_id = t.id
      ORDER BY t.created_at DESC
    `)
    .all();

  const recentQuestions = db
    .prepare(`
      SELECT qn.id, qn.kuis_id as kuisId, q.judul as kuisJudul, qn.pertanyaan, qn.opsi_json as opsiJson, qn.kunci_jawaban as kunciJawaban
      FROM questions qn
      JOIN quizzes q ON q.id = qn.kuis_id
      ORDER BY qn.rowid DESC
      LIMIT 15
    `)
    .all() as Array<{
    id: string;
    kuisId: string;
    kuisJudul: string;
    pertanyaan: string;
    opsiJson: string;
    kunciJawaban: number;
  }>;

  res.json({
    topics,
    recentQuestions: recentQuestions.map((r) => ({
      id: r.id,
      kuisId: r.kuisId,
      kuisJudul: r.kuisJudul,
      pertanyaan: r.pertanyaan,
      opsi: JSON.parse(r.opsiJson) as string[],
      kunciJawaban: r.kunciJawaban,
    })),
  });
});

app.post('/api/guru/materi', (req, res) => {
  const parsed = CreateMateriBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? 'Data materi tidak valid.',
      issues: parsed.error.issues,
    });
    return;
  }

  const data = parsed.data;
  const slugBase = data.judul
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32);
  const topicId = `${data.mapelId.slice(0, 4)}-${slugBase}-${crypto.randomUUID().slice(0, 4)}`;
  const quizId = `kuis-${topicId}`;
  const now = new Date().toISOString();

  const paragraphs = data.isiMateri
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const konten = (paragraphs.length > 0 ? paragraphs : [data.isiMateri]).map((p, idx) => ({
    subjudul: idx === 0 ? 'Konsep Inti & Penjelasan' : `Pendalaman Materi ${idx + 1}`,
    isi: p,
  }));

  const cheatSheet = [
    {
      label: 'Rumus / Poin Utama',
      rumus: data.rumusKunci,
      catatan: data.catatanKunci,
    },
  ];

  db.transaction(() => {
    db.prepare(`
      INSERT INTO topics (id, mapel_id, kelas, bab, judul, ringkasan, durasi_menit, konten_json, cheat_sheet_json, contoh_soal_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      topicId,
      data.mapelId,
      data.kelas,
      data.bab,
      data.judul,
      data.ringkasan,
      data.durasiMenit,
      JSON.stringify(konten),
      JSON.stringify(cheatSheet),
      JSON.stringify([]),
      now
    );

    db.prepare(`
      INSERT INTO quizzes (id, topik_id, judul, durasi_menit)
      VALUES (?, ?, ?, ?)
    `).run(quizId, topicId, `Kuis ${data.judul}`, 10);
  })();

  res.status(201).json({
    topicId,
    quizId,
    judul: data.judul,
  });
});

app.post('/api/guru/soal', (req, res) => {
  const parsed = CreateSoalBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? 'Data soal tidak valid.',
      issues: parsed.error.issues,
    });
    return;
  }

  const data = parsed.data;
  const quizExists = db.prepare('SELECT id FROM quizzes WHERE id = ?').get(data.kuisId);
  if (!quizExists) {
    res.status(404).json({ error: 'Kuis tujuan tidak ditemukan.' });
    return;
  }

  const countRow = db
    .prepare('SELECT COALESCE(MAX(urutan), 0) as maxUrutan FROM questions WHERE kuis_id = ?')
    .get(data.kuisId) as { maxUrutan: number };

  const questionId = `q-${crypto.randomUUID().slice(0, 8)}`;
  const opsi = [data.opsiA, data.opsiB, data.opsiC, data.opsiD];

  db.prepare(`
    INSERT INTO questions (id, kuis_id, pertanyaan, opsi_json, kunci_jawaban, pembahasan, urutan)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(questionId, data.kuisId, data.pertanyaan, JSON.stringify(opsi), data.kunciJawaban, data.pembahasan, countRow.maxUrutan + 1);

  res.status(201).json({
    id: questionId,
    kuisId: data.kuisId,
    urutan: countRow.maxUrutan + 1,
  });
});

// 6. OpenAPI / API Docs JSON summary endpoint
app.get('/api/docs', (_req, res) => {
  res.json({
    service: 'CendekiaSMA API',
    version: '1.0.0',
    endpoints: [
      { method: 'GET', path: '/api/materi', description: 'Daftar mapel & bab (?kelas=10&mapel=...)' },
      { method: 'GET', path: '/api/materi/:topikId', description: 'Detail topik, cheat sheet, & contoh soal' },
      { method: 'POST', path: '/api/materi/:topikId/complete', description: 'Tandai materi selesai & catat XP' },
      { method: 'GET', path: '/api/kuis/:kuisId', description: 'Ambil soal kuis tanpa kunci jawaban' },
      { method: 'POST', path: '/api/kuis/:kuisId/submit', description: 'Kumpulkan jawaban, hitung skor, XP, streak & mastery' },
      { method: 'GET', path: '/api/progres', description: 'Ringkasan progres, XP mapel, mastery & badge' },
      { method: 'GET', path: '/api/gamifikasi/streak', description: 'Status streak harian & freeze' },
      { method: 'POST', path: '/api/gamifikasi/streak/freeze', description: 'Aktifkan streak freeze' },
      { method: 'GET', path: '/api/gamifikasi/leaderboard', description: 'Papan peringkat mingguan opt-in' },
      { method: 'POST', path: '/api/guru/materi', description: 'Terbitkan materi topik baru' },
      { method: 'POST', path: '/api/guru/soal', description: 'Tambahkan soal kuis baru' },
    ],
  });
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CendekiaSMA server listening on http://localhost:${PORT}`);
  });
}

startServer();
