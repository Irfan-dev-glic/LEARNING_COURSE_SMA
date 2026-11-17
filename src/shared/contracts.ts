import { z } from 'zod';

export const KelasSchema = z.union([z.literal(10), z.literal(11), z.literal(12)]);
export type Kelas = z.infer<typeof KelasSchema>;

export const MasteryStatusSchema = z.enum(['belum', 'sedang_belajar', 'menguasai']);
export type MasteryStatus = z.infer<typeof MasteryStatusSchema>;

export const XpEventTypeSchema = z.enum([
  'materi_selesai',
  'kuis_selesai',
  'jawaban_benar',
  'tryout',
]);
export type XpEventType = z.infer<typeof XpEventTypeSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  nama: z.string(),
  email: z.string(),
  role: z.enum(['siswa', 'guru']),
  kelas: KelasSchema,
  kelasLabel: z.string(),
  leaderboardOptIn: z.boolean(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const SubjectSchema = z.object({
  id: z.string(),
  nama: z.string(),
  slug: z.string(),
  deskripsi: z.string(),
  kelompok: z.enum(['MIPA', 'Bahasa & Umum']),
});
export type Subject = z.infer<typeof SubjectSchema>;

export const WorkedExampleSchema = z.object({
  soal: z.string(),
  langkah: z.array(z.string()),
  jawaban: z.string(),
});
export type WorkedExample = z.infer<typeof WorkedExampleSchema>;

export const TopicSummarySchema = z.object({
  id: z.string(),
  mapelId: z.string(),
  mapelNama: z.string(),
  mapelSlug: z.string(),
  kelas: KelasSchema,
  bab: z.string(),
  judul: z.string(),
  ringkasan: z.string(),
  durasiMenit: z.number(),
  kuisId: z.string().nullable(),
  jumlahSoal: z.number(),
  masteryStatus: MasteryStatusSchema,
  skorTerakhir: z.number().nullable(),
  percobaan: z.number(),
});
export type TopicSummary = z.infer<typeof TopicSummarySchema>;

export const TopicDetailSchema = TopicSummarySchema.extend({
  konten: z.array(
    z.object({
      subjudul: z.string(),
      isi: z.string(),
    })
  ),
  cheatSheet: z.array(
    z.object({
      label: z.string(),
      rumus: z.string(),
      catatan: z.string(),
    })
  ),
  contohSoal: z.array(WorkedExampleSchema),
  materiSelesai: z.boolean(),
});
export type TopicDetail = z.infer<typeof TopicDetailSchema>;

export const QuizQuestionPublicSchema = z.object({
  id: z.string(),
  pertanyaan: z.string(),
  opsi: z.array(z.string()).length(4),
  urutan: z.number(),
});
export type QuizQuestionPublic = z.infer<typeof QuizQuestionPublicSchema>;

export const QuizDetailSchema = z.object({
  id: z.string(),
  topikId: z.string(),
  judul: z.string(),
  mapelId: z.string(),
  mapelNama: z.string(),
  kelas: KelasSchema,
  durasiMenit: z.number(),
  soal: z.array(QuizQuestionPublicSchema),
});
export type QuizDetail = z.infer<typeof QuizDetailSchema>;

export const QuizAnswerItemSchema = z.object({
  soalId: z.string(),
  pilihanIndex: z.number().int().min(0).max(3),
});

export const SubmitQuizBodySchema = z.object({
  userId: z.string().min(1),
  jawaban: z.array(QuizAnswerItemSchema),
});
export type SubmitQuizBody = z.infer<typeof SubmitQuizBodySchema>;

export const QuestionReviewSchema = z.object({
  soalId: z.string(),
  pertanyaan: z.string(),
  opsi: z.array(z.string()),
  pilihanUser: z.number().nullable(),
  kunciJawaban: z.number(),
  benar: z.boolean(),
  pembahasan: z.string(),
});
export type QuestionReview = z.infer<typeof QuestionReviewSchema>;

export const BadgeInfoSchema = z.object({
  id: z.string(),
  nama: z.string(),
  deskripsi: z.string(),
  kategori: z.string(),
  earned: z.boolean(),
  earnedAt: z.string().nullable(),
});
export type BadgeInfo = z.infer<typeof BadgeInfoSchema>;

export const SubmitQuizResponseSchema = z.object({
  skor: z.number(),
  benar: z.number(),
  salah: z.number(),
  totalSoal: z.number(),
  xpGained: z.number(),
  totalXp: z.number(),
  newLevel: z.number(),
  streakDays: z.number(),
  freezeSisa: z.number(),
  mastery: z.object({
    topikId: z.string(),
    status: MasteryStatusSchema,
    skorTerakhir: z.number(),
    percobaan: z.number(),
  }),
  unlockedBadges: z.array(BadgeInfoSchema),
  pembahasan: z.array(QuestionReviewSchema),
});
export type SubmitQuizResponse = z.infer<typeof SubmitQuizResponseSchema>;

export const StreakStatusSchema = z.object({
  userId: z.string(),
  hariTerakhir: z.string().nullable(),
  jumlahHari: z.number(),
  freezeSisa: z.number(),
  aktifHariIni: z.boolean(),
});
export type StreakStatus = z.infer<typeof StreakStatusSchema>;

export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  userId: z.string(),
  nama: z.string(),
  kelas: KelasSchema,
  kelasLabel: z.string(),
  xpMingguan: z.number(),
  level: z.number(),
  streakHari: z.number(),
  isCurrentUser: z.boolean(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const ProgressSummarySchema = z.object({
  user: UserProfileSchema,
  totalXp: z.number(),
  level: z.number(),
  xpIntoLevel: z.number(),
  xpForNextLevel: z.number(),
  streak: StreakStatusSchema,
  xpPerMapel: z.array(
    z.object({
      mapelId: z.string(),
      mapelNama: z.string(),
      xp: z.number(),
      level: z.number(),
      topikMenguasai: z.number(),
      totalTopik: z.number(),
    })
  ),
  masteryList: z.array(TopicSummarySchema),
  badges: z.array(BadgeInfoSchema),
  recentXpEvents: z.array(
    z.object({
      id: z.string(),
      mapelId: z.string(),
      mapelNama: z.string(),
      jenis: XpEventTypeSchema,
      jumlah: z.number(),
      createdAt: z.string(),
    })
  ),
});
export type ProgressSummary = z.infer<typeof ProgressSummarySchema>;

export const CreateMateriBodySchema = z.object({
  mapelId: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  kelas: z.coerce.number().pipe(KelasSchema),
  bab: z.string().trim().min(3, 'Nama bab minimal 3 karakter'),
  judul: z.string().trim().min(4, 'Judul topik minimal 4 karakter'),
  ringkasan: z.string().trim().min(10, 'Ringkasan materi minimal 10 karakter'),
  isiMateri: z.string().trim().min(20, 'Penjelasan materi minimal 20 karakter'),
  rumusKunci: z.string().trim().min(2, 'Rumus atau poin kunci wajib diisi'),
  catatanKunci: z.string().trim().min(5, 'Catatan konsep minimal 5 karakter'),
  durasiMenit: z.coerce.number().int().min(5).max(90).default(15),
});
export type CreateMateriBody = z.infer<typeof CreateMateriBodySchema>;

export const CreateSoalBodySchema = z.object({
  kuisId: z.string().min(1, 'Kuis tujuan wajib dipilih'),
  pertanyaan: z.string().trim().min(8, 'Pertanyaan minimal 8 karakter'),
  opsiA: z.string().trim().min(1, 'Opsi A wajib diisi'),
  opsiB: z.string().trim().min(1, 'Opsi B wajib diisi'),
  opsiC: z.string().trim().min(1, 'Opsi C wajib diisi'),
  opsiD: z.string().trim().min(1, 'Opsi D wajib diisi'),
  kunciJawaban: z.coerce.number().int().min(0).max(3),
  pembahasan: z.string().trim().min(8, 'Pembahasan minimal 8 karakter'),
});
export type CreateSoalBody = z.infer<typeof CreateSoalBodySchema>;
