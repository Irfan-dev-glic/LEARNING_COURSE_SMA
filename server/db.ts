import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cendekia.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('siswa', 'guru')),
      kelas INTEGER NOT NULL CHECK(kelas IN (10, 11, 12)),
      kelas_label TEXT NOT NULL,
      leaderboard_opt_in INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      deskripsi TEXT NOT NULL,
      kelompok TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      mapel_id TEXT NOT NULL REFERENCES subjects(id),
      kelas INTEGER NOT NULL CHECK(kelas IN (10, 11, 12)),
      bab TEXT NOT NULL,
      judul TEXT NOT NULL,
      ringkasan TEXT NOT NULL,
      durasi_menit INTEGER NOT NULL DEFAULT 15,
      konten_json TEXT NOT NULL,
      cheat_sheet_json TEXT NOT NULL,
      contoh_soal_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      topik_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      judul TEXT NOT NULL,
      durasi_menit INTEGER NOT NULL DEFAULT 15
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      kuis_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      pertanyaan TEXT NOT NULL,
      opsi_json TEXT NOT NULL,
      kunci_jawaban INTEGER NOT NULL CHECK(kunci_jawaban BETWEEN 0 AND 3),
      pembahasan TEXT NOT NULL,
      urutan INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS xp_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      mapel_id TEXT NOT NULL REFERENCES subjects(id),
      jenis TEXT NOT NULL CHECK(jenis IN ('materi_selesai', 'kuis_selesai', 'jawaban_benar', 'tryout')),
      jumlah INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topic_completions (
      user_id TEXT NOT NULL REFERENCES users(id),
      topik_id TEXT NOT NULL REFERENCES topics(id),
      completed_at TEXT NOT NULL,
      PRIMARY KEY (user_id, topik_id)
    );

    CREATE TABLE IF NOT EXISTS streak (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      hari_terakhir TEXT,
      jumlah_hari INTEGER NOT NULL DEFAULT 0,
      freeze_sisa INTEGER NOT NULL DEFAULT 2
    );

    CREATE TABLE IF NOT EXISTS mastery (
      user_id TEXT NOT NULL REFERENCES users(id),
      topik_id TEXT NOT NULL REFERENCES topics(id),
      status TEXT NOT NULL CHECK(status IN ('belum', 'sedang_belajar', 'menguasai')),
      skor_terakhir REAL NOT NULL DEFAULT 0,
      percobaan INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, topik_id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      deskripsi TEXT NOT NULL,
      kategori TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      user_id TEXT NOT NULL REFERENCES users(id),
      badge_id TEXT NOT NULL REFERENCES badges(id),
      earned_at TEXT NOT NULL,
      PRIMARY KEY (user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS leaderboard_weekly (
      minggu TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      kelas_id TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (minggu, user_id)
    );
  `);

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    seedDatabase();
  }
}

export function getMondayDateISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getRelativeDateISO(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function seedDatabase() {
  const tx = db.transaction(() => {
    const insertUser = db.prepare(`
      INSERT INTO users (id, nama, email, role, kelas, kelas_label, leaderboard_opt_in)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('siswa-10-nadia', 'Nadia Kusuma', 'nadia.kusuma@sma.id', 'siswa', 10, 'X MIPA 1', 1);
    insertUser.run('siswa-11-rafi', 'Rafi Pratama', 'rafi.pratama@sma.id', 'siswa', 11, 'XI MIPA 2', 1);
    insertUser.run('siswa-12-sinta', 'Sinta Maharani', 'sinta.maharani@sma.id', 'siswa', 12, 'XII MIPA 1', 1);
    insertUser.run('siswa-10-bima', 'Bima Nugroho', 'bima.nugroho@sma.id', 'siswa', 10, 'X MIPA 1', 1);
    insertUser.run('siswa-11-alyssa', 'Alyssa Putri', 'alyssa.putri@sma.id', 'siswa', 11, 'XI MIPA 2', 1);
    insertUser.run('guru-hendra', 'Pak Hendra Wijaya, M.Pd.', 'hendra.wijaya@sma.id', 'guru', 11, 'Pengajar Kurikulum SMA', 0);

    const insertSubject = db.prepare(`
      INSERT INTO subjects (id, nama, slug, deskripsi, kelompok)
      VALUES (?, ?, ?, ?, ?)
    `);

    const subjects = [
      ['matematika', 'Matematika', 'matematika', 'Aljabar, trigonometri, kalkulus diferensial, dan statistika analitik.', 'MIPA'],
      ['fisika', 'Fisika', 'fisika', 'Mekanika gerak, termodinamika, gelombang, dan elektromagnetisme.', 'MIPA'],
      ['kimia', 'Kimia', 'kimia', 'Struktur atom, stoikiometri, kesetimbangan kimia, dan reaksi redoks.', 'MIPA'],
      ['biologi', 'Biologi', 'biologi', 'Metabolisme sel, genetika molekuler, dan sistem koordinasi manusia.', 'MIPA'],
      ['bahasa-indonesia', 'Bahasa Indonesia', 'bahasa-indonesia', 'Analisis teks argumentasi, karya ilmiah, dan penalaran wacana.', 'Bahasa & Umum'],
      ['bahasa-inggris', 'Bahasa Inggris', 'bahasa-inggris', 'Reading comprehension, analytical exposition, dan academic writing.', 'Bahasa & Umum'],
    ];
    for (const s of subjects) {
      insertSubject.run(...s);
    }

    const insertTopic = db.prepare(`
      INSERT INTO topics (id, mapel_id, kelas, bab, judul, ringkasan, durasi_menit, konten_json, cheat_sheet_json, contoh_soal_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertQuiz = db.prepare(`
      INSERT INTO quizzes (id, topik_id, judul, durasi_menit)
      VALUES (?, ?, ?, ?)
    `);
    const insertQuestion = db.prepare(`
      INSERT INTO questions (id, kuis_id, pertanyaan, opsi_json, kunci_jawaban, pembahasan, urutan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    const topicsData = [
      {
        id: 'mtk-trigonometri',
        mapelId: 'matematika',
        kelas: 10,
        bab: 'Bab 1 · Trigonometri Dasar',
        judul: 'Perbandingan & Identitas Trigonometri Segitiga Siku-Siku',
        ringkasan: 'Memahami definisi sinus, kosinus, tangen pada segitiga siku-siku serta identitas dasar kuadran I–IV.',
        durasiMenit: 18,
        konten: [
          {
            subjudul: 'Konsep Perbandingan Sisi Segitiga Siku-Siku',
            isi: 'Pada segitiga siku-siku dengan sudut lancip θ, rasio antara sisi depan, sisi samping, dan sisi miring (hipotenusa) selalu konstan berapapun ukuran segitiganya. Prinsip kesebangunan inilah yang menjadi fondasi sinus, kosinus, dan tangen untuk menghitung tinggi gedung, sudut elevasi, maupun vektor fisika.',
          },
          {
            subjudul: 'Sudut Istimewa dan Tanda di Empat Kuadran',
            isi: 'Sudut 0°, 30°, 45°, 60°, dan 90° memiliki nilai rasio eksak yang wajib dikuasai tanpa kalkulator. Ketika sudut melebar ke kuadran II, III, atau IV pada lingkaran satuan, tanda positif/negatif mengikuti koordinat (x, y) di mana cos θ sejalan dengan sumbu-x dan sin θ sejalan dengan sumbu-y.',
          },
        ],
        cheatSheet: [
          { label: 'Definisi Dasar', rumus: 'sin θ = depan / miring · cos θ = samping / miring · tan θ = depan / samping', catatan: 'Hafalkan dengan singkatan SOH-CAH-TOA.' },
          { label: 'Identitas Pythagoras', rumus: 'sin²θ + cos²θ = 1', catatan: 'Berlaku untuk seluruh nilai sudut θ real.' },
          { label: 'Sudut Istimewa', rumus: 'sin 30° = 1/2 · sin 45° = 1/2√2 · sin 60° = 1/2√3', catatan: 'Nilai cos merupakan kebalikan urutan dari sin pada 0°–90°.' },
        ],
        contohSoal: [
          {
            soal: 'Diketahui segitiga ABC siku-siku di B dengan panjang AB = 8 cm dan BC = 6 cm. Tentukan nilai sin A!',
            langkah: [
              'Hitung hipotenusa AC menggunakan Teorema Pythagoras: AC = √(8² + 6²) = √(64 + 36) = 10 cm.',
              'Sisi depan sudut A adalah BC = 6 cm, sedangkan sisi miring adalah AC = 10 cm.',
              'Hitung sin A = depan / miring = 6 / 10 = 3/5.',
            ],
            jawaban: 'sin A = 3/5 atau 0,6',
          },
        ],
        quizId: 'kuis-mtk-trigonometri',
        quizJudul: 'Kuis Pemahaman Trigonometri Dasar',
        questions: [
          {
            id: 'q-trig-1',
            pertanyaan: 'Jika sin α = 5/13 dan α berada di kuadran I, berapakah nilai cos α?',
            opsi: ['12/13', '8/13', '5/12', '13/12'],
            kunci: 0,
            pembahasan: 'Dengan tripel Pythagoras (5, 12, 13) atau sin²α + cos²α = 1, diperoleh cos α = √(1 - 25/169) = 12/13 (positif di kuadran I).',
          },
          {
            id: 'q-trig-2',
            pertanyaan: 'Nilai dari 2 sin 30° + cos 60° adalah...',
            opsi: ['1', '1,5', '√3', '2'],
            kunci: 1,
            pembahasan: 'sin 30° = 1/2 dan cos 60° = 1/2. Maka 2(1/2) + 1/2 = 1 + 0,5 = 1,5.',
          },
          {
            id: 'q-trig-3',
            pertanyaan: 'Seorang pengamat berdiri 20 meter dari kaki menara dan melihat puncak menara dengan sudut elevasi 45°. Jika tinggi mata pengamat diabaikan, tinggi menara adalah...',
            opsi: ['10 meter', '10√2 meter', '20 meter', '20√3 meter'],
            kunci: 2,
            pembahasan: 'tan 45° = tinggi / jarak = 1. Karena jarak = 20 m, maka tinggi menara = 20 × 1 = 20 meter.',
          },
        ],
      },
      {
        id: 'mtk-eksponen',
        mapelId: 'matematika',
        kelas: 10,
        bab: 'Bab 2 · Eksponen & Logaritma',
        judul: 'Sifat Bilangan Berpangkat & Pertumbuhan Eksponensial',
        ringkasan: 'Menguasai hukum pangkat pecahan, negatif, serta pemodelan pertumbuhan majemuk dan peluruhan.',
        durasiMenit: 15,
        konten: [
          {
            subjudul: 'Hukum Aljabar Eksponen',
            isi: 'Perkalian bilangan berpangkat dengan basis sama menjumlahkan eksponennya, sedangkan pembagian mengurangkan eksponennya. Eksponen negatif menyatakan kebalikan (invers perkalian), dan eksponen pecahan merepresentasikan bentuk akar.',
          },
          {
            subjudul: 'Aplikasi Peluruhan dan Bunga Majemuk',
            isi: 'Fungsi eksponensial f(t) = A · b^t memodelkan fenomena dengan laju perubahan sebanding dengan ukuran saat ini, seperti pembelahan sel bakteri, bunga majemuk perbankan, dan peluruhan zat radioaktif.',
          },
        ],
        cheatSheet: [
          { label: 'Perkalian & Pembagian', rumus: 'aᵐ · aⁿ = aᵐ⁺ⁿ · aᵐ / aⁿ = aᵐ⁻ⁿ', catatan: 'Berlaku bila basis a sama dan a ≠ 0.' },
          { label: 'Pangkat Negatif & Nol', rumus: 'a⁰ = 1 · a⁻ⁿ = 1 / aⁿ', catatan: 'Untuk semua a ≠ 0.' },
          { label: 'Pangkat Pecahan', rumus: 'a^(m/n) = ⁿ√(aᵐ)', catatan: 'Penyebut pangkat menjadi indeks akar.' },
        ],
        contohSoal: [
          {
            soal: 'Sederhanakan nilai dari (2³ · 4²) / 8².',
            langkah: [
              'Ubah semua bilangan ke basis 2: 4 = 2² dan 8 = 2³.',
              'Substitusi: (2³ · (2²)²) / (2³)² = (2³ · 2⁴) / 2⁶.',
              'Operasikan pangkat: 2^(3+4-6) = 2¹ = 2.',
            ],
            jawaban: '2',
          },
        ],
        quizId: 'kuis-mtk-eksponen',
        quizJudul: 'Kuis Eksponen & Persamaan Pangkat',
        questions: [
          {
            id: 'q-eks-1',
            pertanyaan: 'Nilai x yang memenuhi persamaan 3^(2x - 1) = 27 adalah...',
            opsi: ['1', '2', '3', '4'],
            kunci: 1,
            pembahasan: '27 = 3³, sehingga 2x - 1 = 3 → 2x = 4 → x = 2.',
          },
          {
            id: 'q-eks-2',
            pertanyaan: 'Bentuk sederhana dari (a⁴ · b⁻²)² adalah...',
            opsi: ['a⁸ / b⁴', 'a⁶ / b⁴', 'a⁸ · b⁴', 'a² / b'],
            kunci: 0,
            pembahasan: 'Pangkatkan masing-masing faktor: a^(4×2) · b^(-2×2) = a⁸ · b⁻⁴ = a⁸ / b⁴.',
          },
          {
            id: 'q-eks-3',
            pertanyaan: 'Sebuah koloni bakteri berjumlah 100 sel membelah dua kali lipat setiap 1 jam. Berapa jumlah sel setelah 4 jam?',
            opsi: ['400 sel', '800 sel', '1.600 sel', '3.200 sel'],
            kunci: 2,
            pembahasan: 'N(4) = 100 × 2⁴ = 100 × 16 = 1.600 sel.',
          },
        ],
      },
      {
        id: 'fis-gerak-lurus',
        mapelId: 'fisika',
        kelas: 10,
        bab: 'Bab 1 · Kinematika Gerak',
        judul: 'GLB, GLBB & Analisis Grafik Kecepatan-Waktu',
        ringkasan: 'Membedakan gerak lurus beraturan dan berubah beraturan melalui persamaan kinematika dan luas grafik v-t.',
        durasiMenit: 20,
        konten: [
          {
            subjudul: 'Kecepatan Tetap vs Percepatan Konstan',
            isi: 'Pada Gerak Lurus Beraturan (GLB), percepatan bernilai nol sehingga kecepatan benda konstan sepanjang waktu. Pada Gerak Lurus Berubah Beraturan (GLBB), percepatan bernilai konstan sehingga kecepatan berubah secara linear terhadap waktu.',
          },
          {
            subjudul: 'Interpretasi Grafik v–t',
            isi: 'Kemiringan (gradien) garis pada grafik v–t menyatakan percepatan sesaat benda, sedangkan luas daerah di bawah kurva grafik v–t terhadap sumbu waktu menyatakan perpindahan total yang ditempuh benda.',
          },
        ],
        cheatSheet: [
          { label: 'GLB', rumus: 's = v · t', catatan: 'v konstan, percepatan a = 0.' },
          { label: 'GLBB Kecepatan', rumus: 'vₜ = v₀ + a · t', catatan: 'Gunakan a negatif saat benda mengalami perlambatan.' },
          { label: 'GLBB Jarak', rumus: 's = v₀·t + ½·a·t² · vₜ² = v₀² + 2·a·s', catatan: 'Pilih rumus tanpa waktu t jika waktu tidak diketahui.' },
        ],
        contohSoal: [
          {
            soal: 'Sebuah mobil bergerak dari keadaan diam dengan percepatan tetap 2 m/s² selama 10 detik. Berapa jarak tempuhnya?',
            langkah: [
              'Diketahui v₀ = 0 m/s, a = 2 m/s², t = 10 s.',
              'Gunakan s = v₀·t + ½·a·t².',
              's = 0 + ½ · 2 · 10² = 100 meter.',
            ],
            jawaban: '100 meter',
          },
        ],
        quizId: 'kuis-fis-gerak-lurus',
        quizJudul: 'Kuis Kinematika GLB & GLBB',
        questions: [
          {
            id: 'q-fis-1',
            pertanyaan: 'Sebuah benda melaju dengan kecepatan awal 10 m/s lalu direm hingga berhenti dalam waktu 5 detik. Perlambatan benda tersebut adalah...',
            opsi: ['1 m/s²', '2 m/s²', '5 m/s²', '10 m/s²'],
            kunci: 1,
            pembahasan: 'a = (vₜ - v₀) / t = (0 - 10) / 5 = -2 m/s², artinya perlambatan sebesar 2 m/s².',
          },
          {
            id: 'q-fis-2',
            pertanyaan: 'Besaran fisika yang ditunjukkan oleh luas daerah di bawah grafik kecepatan (v) terhadap waktu (t) adalah...',
            opsi: ['Percepatan', 'Gaya', 'Perpindahan', 'Momentum'],
            kunci: 2,
            pembahasan: 'Integral atau luas kurva v(t) terhadap t menghasilkan perpindahan Δx.',
          },
          {
            id: 'q-fis-3',
            pertanyaan: 'Bola dijatuhkan bebas dari ketinggian 45 meter (g = 10 m/s²). Kecepatan bola sesaat sebelum menyentuh tanah adalah...',
            opsi: ['15 m/s', '20 m/s', '30 m/s', '45 m/s'],
            kunci: 2,
            pembahasan: 'v = √(2·g·h) = √(2 × 10 × 45) = √900 = 30 m/s.',
          },
        ],
      },
      {
        id: 'mtk-turunan',
        mapelId: 'matematika',
        kelas: 11,
        bab: 'Bab 3 · Kalkulus Diferensial',
        judul: 'Turunan Fungsi Aljabar & Titik Stasioner',
        ringkasan: 'Menghitung laju perubahan sesaat menggunakan aturan pangkat, rantai, serta menentukan nilai maksimum-minimum lokal.',
        durasiMenit: 22,
        konten: [
          {
            subjudul: 'Makna Geometris Turunan Pertama',
            isi: 'Turunan pertama f\'(x) di suatu titik merepresentasikan gradien garis singgung kurva pada titik tersebut. Jika f\'(x) > 0 fungsi sedang naik, jika f\'(x) < 0 fungsi sedang turun, dan jika f\'(x) = 0 kurva berada pada titik stasioner.',
          },
          {
            subjudul: 'Optimasi Masalah Nyata',
            isi: 'Dengan menyamakan turunan pertama terhadap nol, kita dapat mencari dimensi kotak dengan volume terbesar, luas lahan maksimum dari panjang pagar tertentu, maupun biaya produksi minimum.',
          },
        ],
        cheatSheet: [
          { label: 'Aturan Pangkat', rumus: 'f(x) = a·xⁿ → f\'(x) = a·n·xⁿ⁻¹', catatan: 'Turunan konstanta selalu 0.' },
          { label: 'Aturan Perkalian', rumus: '(u·v)\' = u\'·v + u·v\'', catatan: 'Gunakan untuk dua fungsi yang dikalikan.' },
          { label: 'Syarat Stasioner', rumus: 'f\'(x) = 0', catatan: 'Uji tanda f\'(x) di kiri-kanan titik untuk menentukan maksimum/minimum.' },
        ],
        contohSoal: [
          {
            soal: 'Tentukan nilai maksimum fungsi f(x) = -x² + 6x - 5.',
            langkah: [
              'Cari turunan pertama: f\'(x) = -2x + 6.',
              'Syarat stasioner f\'(x) = 0 → -2x + 6 = 0 → x = 3.',
              'Substitusi x = 3 ke f(x): f(3) = -(3)² + 6(3) - 5 = -9 + 18 - 5 = 4.',
            ],
            jawaban: 'Nilai maksimum = 4 pada x = 3',
          },
        ],
        quizId: 'kuis-mtk-turunan',
        quizJudul: 'Kuis Turunan Fungsi & Optimasi',
        questions: [
          {
            id: 'q-tur-1',
            pertanyaan: 'Turunan pertama dari f(x) = 4x³ - 5x² + 7x - 9 adalah...',
            opsi: ['12x² - 10x + 7', '12x² - 5x + 7', '4x² - 10x + 7', '12x³ - 10x² + 7'],
            kunci: 0,
            pembahasan: 'f\'(x) = 4·3x² - 5·2x + 7 = 12x² - 10x + 7.',
          },
          {
            id: 'q-tur-2',
            pertanyaan: 'Gradien garis singgung kurva y = x² - 4x + 1 pada titik berabsis x = 3 adalah...',
            opsi: ['1', '2', '4', '6'],
            kunci: 1,
            pembahasan: 'm = y\'(3). Karena y\' = 2x - 4, maka m = 2(3) - 4 = 2.',
          },
          {
            id: 'q-tur-3',
            pertanyaan: 'Sebuah peluru ditembakkan ke atas dengan ketinggian h(t) = 40t - 5t² meter. Tinggi maksimum yang dicapai peluru adalah...',
            opsi: ['40 meter', '60 meter', '80 meter', '100 meter'],
            kunci: 2,
            pembahasan: 'h\'(t) = 40 - 10t = 0 → t = 4 detik. h(4) = 40(4) - 5(16) = 160 - 80 = 80 meter.',
          },
        ],
      },
      {
        id: 'kim-stoikiometri',
        mapelId: 'kimia',
        kelas: 11,
        bab: 'Bab 1 · Stoikiometri & Larutan',
        judul: 'Konsep Mol, Massa Molar & Pereaksi Pembatas',
        ringkasan: 'Menghubungkan jumlah partikel, massa zat, volume gas STP, dan penentuan pereaksi yang habis bereaksi lebih dulu.',
        durasiMenit: 18,
        konten: [
          {
            subjudul: 'Jembatan Mol dalam Reaksi Kimia',
            isi: 'Mol adalah satuan pusat dalam kimia untuk membandingkan kuantitas zat berdasarkan koefisien persamaan reaksi yang setara. Massa, jumlah partikel, maupun volume gas semuanya harus dikonversi ke mol sebelum membandingkan rasio koefisien.',
          },
          {
            subjudul: 'Menentukan Pereaksi Pembatas',
            isi: 'Ketika dua reaktan dicampurkan, reaktan yang memiliki hasil bagi (mol mula-mula / koefisien) paling kecil akan habis lebih dulu dan menentukan jumlah maksimal produk yang terbentuk.',
          },
        ],
        cheatSheet: [
          { label: 'Hubungan Massa', rumus: 'n = massa (gram) / Mr', catatan: 'Mr adalah jumlah Ar seluruh atom penyusun senyawa.' },
          { label: 'Volume Gas STP', rumus: 'V = n × 22,4 Liter', catatan: 'Berlaku pada kondisi 0°C dan 1 atm.' },
          { label: 'Molaritas Larutan', rumus: 'M = n / V (Liter)', catatan: 'Menyatakan konsentrasi zat terlarut.' },
        ],
        contohSoal: [
          {
            soal: 'Berapa mol yang terdapat dalam 11 gram gas CO₂ (Ar C = 12, O = 16)?',
            langkah: [
              'Hitung Mr CO₂ = 12 + 2(16) = 44 g/mol.',
              'Gunakan n = massa / Mr = 11 / 44 = 0,25 mol.',
            ],
            jawaban: '0,25 mol',
          },
        ],
        quizId: 'kuis-kim-stoikiometri',
        quizJudul: 'Kuis Konsep Mol & Pereaksi Pembatas',
        questions: [
          {
            id: 'q-kim-1',
            pertanyaan: 'Massa dari 0,5 mol air (H₂O) dengan Ar H = 1 dan O = 16 adalah...',
            opsi: ['9 gram', '18 gram', '27 gram', '36 gram'],
            kunci: 0,
            pembahasan: 'Mr H₂O = 2(1) + 16 = 18. Massa = n × Mr = 0,5 × 18 = 9 gram.',
          },
          {
            id: 'q-kim-2',
            pertanyaan: 'Volume 2 mol gas oksigen pada keadaan standar (STP) adalah...',
            opsi: ['11,2 L', '22,4 L', '44,8 L', '67,2 L'],
            kunci: 2,
            pembahasan: 'Pada STP, V = n × 22,4 L = 2 × 22,4 = 44,8 Liter.',
          },
          {
            id: 'q-kim-3',
            pertanyaan: 'Jika 2 mol H₂ direaksikan dengan 2 mol O₂ menurut reaksi 2H₂ + O₂ → 2H₂O, zat yang bertindak sebagai pereaksi pembatas adalah...',
            opsi: ['O₂', 'H₂', 'H₂O', 'Keduanya habis'],
            kunci: 1,
            pembahasan: 'Rasio mol/koefisien: H₂ = 2/2 = 1; O₂ = 2/1 = 2. Nilai terkecil adalah H₂ sehingga H₂ habis terlebih dahulu.',
          },
        ],
      },
      {
        id: 'bio-genetika',
        mapelId: 'biologi',
        kelas: 12,
        bab: 'Bab 2 · Substansi Genetika & Pewarisan',
        judul: 'Sintesis Protein: Transkripsi, Translasi & Kode Genetik',
        ringkasan: 'Menelusuri alur dogma sentral biologi molekuler dari untai DNA menuju mRNA hingga pembentukan polipeptida di ribosom.',
        durasiMenit: 16,
        konten: [
          {
            subjudul: 'Tahap Transkripsi di Nukleus',
            isi: 'Enzim RNA polimerase membuka heliks ganda DNA dan menyalin untai cetakan (template 3\'→5\') menjadi molekul mRNA (5\'→3\'). Basa timin (T) pada DNA digantikan oleh urasil (U) pada RNA.',
          },
          {
            subjudul: 'Tahap Translasi di Ribosom',
            isi: 'mRNA keluar menuju sitoplasma dan dibaca oleh ribosom per tiga basa (kodon). Molekul tRNA membawa asam amino spesifik sesuai antikodon komplementernya hingga mencapai kodon stop (UAA, UAG, atau UGA).',
          },
        ],
        cheatSheet: [
          { label: 'Pasangan Basa Transkripsi', rumus: 'DNA A→U · T→A · G→C · C→G', catatan: 'RNA tidak memiliki basa Timin (T).' },
          { label: 'Kodon Start', rumus: 'AUG (Metionin)', catatan: 'Menandai awal pembacaan rantai polipeptida.' },
          { label: 'Kodon Stop', rumus: 'UAA · UAG · UGA', catatan: 'Menghentikan proses translasi di ribosom.' },
        ],
        contohSoal: [
          {
            soal: 'Jika untai DNA template memiliki urutan basa 3\'-TAC-GCA-5\', tentukan urutan kodon mRNA yang terbentuk!',
            langkah: [
              'Pasangkan setiap basa template DNA dengan RNA komplementer.',
              'T→A, A→U, C→G sehingga TAC menjadi AUG.',
              'G→C, C→G, A→U sehingga GCA menjadi CGU.',
            ],
            jawaban: '5\'-AUG-CGU-3\'',
          },
        ],
        quizId: 'kuis-bio-genetika',
        quizJudul: 'Kuis Sintesis Protein & Dogma Sentral',
        questions: [
          {
            id: 'q-bio-1',
            pertanyaan: 'Proses penyalinan kode genetik dari DNA menjadi mRNA di dalam inti sel disebut...',
            opsi: ['Replikasi', 'Transkripsi', 'Translasi', 'Mutasi'],
            kunci: 1,
            pembahasan: 'Transkripsi adalah sintesis mRNA dari cetakan DNA di nukleus.',
          },
          {
            id: 'q-bio-2',
            pertanyaan: 'Jika kodon pada mRNA adalah GCU, maka antikodon pada tRNA yang berpasangan adalah...',
            opsi: ['CGA', 'CGT', 'GCU', 'TAC'],
            kunci: 0,
            pembahasan: 'Pasangan RNA-ke-RNA: G↔C, C↔G, U↔A, sehingga GCU berpasangan dengan CGA.',
          },
          {
            id: 'q-bio-3',
            pertanyaan: 'Manakah di bawah ini yang termasuk kodon stop pada sintesis protein?',
            opsi: ['AUG', 'UAG', 'GUA', 'UUU'],
            kunci: 1,
            pembahasan: 'Tiga kodon stop adalah UAA, UAG, dan UGA.',
          },
        ],
      },
      {
        id: 'bind-argumentasi',
        mapelId: 'bahasa-indonesia',
        kelas: 12,
        bab: 'Bab 1 · Penalaran Teks & Karya Ilmiah',
        judul: 'Struktur Paragraf Argumentasi, Opini vs Fakta & Kalimat Efektif',
        ringkasan: 'Membedakan pernyataan fakta yang terverifikasi dari opini penulis serta menyusun kalimat efektif sesuai PUEBI/EYD V.',
        durasiMenit: 14,
        konten: [
          {
            subjudul: 'Membedakan Fakta dan Opini dalam Teks Editorial',
            isi: 'Fakta memuat data terukur, tanggal, lokasi, atau peristiwa yang telah terbukti terjadi secara objektif. Sebaliknya, opini memuat penilaian subjektif, prediksi masa depan, saran, atau kata sifat evaluatif seperti "seharusnya", "lebih baik", dan "sangat penting".',
          },
          {
            subjudul: 'Syarat Kalimat Efektif',
            isi: 'Kalimat efektif wajib memiliki struktur subjek-predikat yang jelas, tidak bertele-tele (pleonasme), memiliki kesejajaran bentuk kata (paralelisme), dan menghindari kerancuan makna.',
          },
        ],
        cheatSheet: [
          { label: 'Ciri Fakta', rumus: 'Data numerik · Waktu/tempat jelas · Terverifikasi', catatan: 'Bebas kata sifat evaluatif subjektif.' },
          { label: 'Ciri Opini', rumus: 'Saran · Prediksi · Kata "sebaiknya / diduga"', catatan: 'Mencerminkan sudut pandang penulis.' },
          { label: 'Anti-Pleonasme', rumus: 'Hindari "para siswa-siswi", "naik ke atas"', catatan: 'Gunakan satu penanda jamak atau arah saja.' },
        ],
        contohSoal: [
          {
            soal: 'Perbaiki kalimat tidak efektif berikut: "Bagi seluruh peserta diharapkan hadir tepat waktu."',
            langkah: [
              'Kata depan "Bagi" di awal membuat subjek kalimat hilang.',
              'Hilangkan kata depan "Bagi" agar "Seluruh peserta" berfungsi sebagai subjek.',
            ],
            jawaban: 'Seluruh peserta diharapkan hadir tepat waktu.',
          },
        ],
        quizId: 'kuis-bind-argumentasi',
        quizJudul: 'Kuis Kalimat Efektif & Analisis Fakta-Opini',
        questions: [
          {
            id: 'q-bind-1',
            pertanyaan: 'Manakah kalimat berikut yang merupakan kalimat efektif?',
            opsi: [
              'Kepada para hadirin dimohon berdiri.',
              'Hadirin dimohon berdiri.',
              'Para hadirin sekalian dimohon untuk berdiri.',
              'Bagi hadirin harap berdiri.',
            ],
            kunci: 1,
            pembahasan: '"Hadirin" sudah bermakna jamak sehingga tidak perlu "para" atau "sekalian", dan tidak diawali preposisi.',
          },
          {
            id: 'q-bind-2',
            pertanyaan: 'Kalimat manakah yang menyatakan fakta?',
            opsi: [
              'Sebaiknya pemerintah memperbanyak jalur sepeda di kota besar.',
              'Program literasi sekolah diprediksi akan meningkatkan minat baca.',
              'Berdasarkan data BPS 2025, tingkat melek huruf penduduk mencapai 96,5%.',
              'Karya sastra klasik terasa jauh lebih mendalam dibanding novel modern.',
            ],
            kunci: 2,
            pembahasan: 'Kalimat ketiga menyajikan data kuantitatif dan sumber resmi yang dapat diverifikasi.',
          },
        ],
      },
      {
        id: 'bing-analytical',
        mapelId: 'bahasa-inggris',
        kelas: 11,
        bab: 'Bab 2 · Analytical Exposition',
        judul: 'Thesis, Arguments & Reiteration in Academic Reading',
        ringkasan: 'Menganalisis struktur teks eksposisi analitis, menentukan gagasan utama paragraf, dan memahami penanda kohesi logis.',
        durasiMenit: 15,
        konten: [
          {
            subjudul: 'Struktur Teks Analytical Exposition',
            isi: 'Teks eksposisi analitis bertujuan meyakinkan pembaca bahwa suatu topik penting untuk diperhatikan. Strukturnya terdiri dari Thesis (pernyataan posisi penulis), Arguments (rangkaian alasan dan bukti pendukung), dan Reiteration (penegasan kembali posisi penulis).',
          },
          {
            subjudul: 'Logical Connectors',
            isi: 'Untuk menautkan argumen secara kohesif, gunakan konjungsi kausal (because, therefore, consequently) dan konjungsi kontras (however, although, nevertheless) sesuai hubungan logis antarkalimat.',
          },
        ],
        cheatSheet: [
          { label: 'Struktur Teks', rumus: 'Thesis → Arguments → Reiteration', catatan: 'Menggunakan Simple Present Tense.' },
          { label: 'Hubungan Kausal', rumus: 'Because / Since + Clause · Because of + Noun Phrase', catatan: 'Perhatikan perbedaan struktur setelah konjungsi.' },
          { label: 'Kontras', rumus: 'Although + Clause · Despite + Noun Phrase', catatan: 'Menyatakan pertentangan gagasan.' },
        ],
        contohSoal: [
          {
            soal: 'Lengkapi kalimat: "_____ the heavy rain, the outdoor science fair proceeded smoothly."',
            langkah: [
              'Frasa "the heavy rain" adalah noun phrase (bukan klausa subjek+predikat).',
              'Pilih preposisi kontras yang diikuti noun phrase: "Despite" atau "In spite of".',
            ],
            jawaban: 'Despite',
          },
        ],
        quizId: 'kuis-bing-analytical',
        quizJudul: 'Kuis Analytical Exposition & Connectors',
        questions: [
          {
            id: 'q-bing-1',
            pertanyaan: 'What is the communicative purpose of an analytical exposition text?',
            opsi: [
              'To entertain readers with a fictional story',
              'To persuade readers that an issue is important',
              'To describe the steps to operate a device',
              'To retell past personal experiences chronologically',
            ],
            kunci: 1,
            pembahasan: 'Analytical exposition aims to persuade the reader that the presented topic or issue is an important matter.',
          },
          {
            id: 'q-bing-2',
            pertanyaan: 'Choose the correct connector: "She studied consistently every evening; _____, her physics score improved significantly."',
            opsi: ['however', 'although', 'consequently', 'despite'],
            kunci: 2,
            pembahasan: '"Consequently" menyatakan hubungan sebab-akibat (hasil dari belajar konsisten).',
          },
        ],
      },
    ];

    for (const t of topicsData) {
      insertTopic.run(
        t.id,
        t.mapelId,
        t.kelas,
        t.bab,
        t.judul,
        t.ringkasan,
        t.durasiMenit,
        JSON.stringify(t.konten),
        JSON.stringify(t.cheatSheet),
        JSON.stringify(t.contohSoal),
        now
      );
      insertQuiz.run(t.quizId, t.id, t.quizJudul, 12);
      t.questions.forEach((q, idx) => {
        insertQuestion.run(q.id, t.quizId, q.pertanyaan, JSON.stringify(q.opsi), q.kunci, q.pembahasan, idx + 1);
      });
    }

    // Seed badges
    const insertBadge = db.prepare(`
      INSERT INTO badges (id, nama, deskripsi, kategori)
      VALUES (?, ?, ?, ?)
    `);
    insertBadge.run('langkah-pertama', 'Langkah Pertama', 'Menyelesaikan 1 topik materi pertama di CendekiaSMA.', 'Pembelajaran');
    insertBadge.run('penakluk-kuis', 'Penakluk Kuis', 'Memperoleh skor minimal 80 pada salah satu kuis topik.', 'Asesmen');
    insertBadge.run('ahli-materi', 'Ahli Materi', 'Menguasai minimal 3 topik pembelajaran lintas mata pelajaran.', 'Penguasaan');
    insertBadge.run('api-konsisten', 'Api Konsisten', 'Menjaga streak belajar harian selama 5 hari berturut-turut.', 'Kebiasaan');
    insertBadge.run('nilai-sempurna', 'Skor Paripurna', 'Meraih nilai 100 pada sebuah kuis.', 'Asesmen');

    // Seed streaks & initial gamification progress for realistic immediate state
    const insertStreak = db.prepare(`
      INSERT INTO streak (user_id, hari_terakhir, jumlah_hari, freeze_sisa)
      VALUES (?, ?, ?, ?)
    `);
    const yesterday = getRelativeDateISO(-1);
    const today = getRelativeDateISO(0);

    insertStreak.run('siswa-10-nadia', yesterday, 6, 2);
    insertStreak.run('siswa-11-rafi', today, 4, 1);
    insertStreak.run('siswa-12-sinta', today, 12, 2);
    insertStreak.run('siswa-10-bima', yesterday, 3, 2);
    insertStreak.run('siswa-11-alyssa', today, 7, 2);
    insertStreak.run('guru-hendra', today, 1, 2);

    const insertXp = db.prepare(`
      INSERT INTO xp_events (id, user_id, mapel_id, jenis, jumlah, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMastery = db.prepare(`
      INSERT INTO mastery (user_id, topik_id, status, skor_terakhir, percobaan)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertCompletion = db.prepare(`
      INSERT INTO topic_completions (user_id, topik_id, completed_at)
      VALUES (?, ?, ?)
    `);
    const insertUserBadge = db.prepare(`
      INSERT INTO user_badges (user_id, badge_id, earned_at)
      VALUES (?, ?, ?)
    `);

    // Nadia (Kelas 10) initial progress
    insertCompletion.run('siswa-10-nadia', 'mtk-trigonometri', now);
    insertXp.run('xp-seed-1', 'siswa-10-nadia', 'matematika', 'materi_selesai', 50, getRelativeDateISO(-2) + 'T14:20:00.000Z');
    insertXp.run('xp-seed-2', 'siswa-10-nadia', 'matematika', 'kuis_selesai', 120, getRelativeDateISO(-1) + 'T16:10:00.000Z');
    insertXp.run('xp-seed-3', 'siswa-10-nadia', 'fisika', 'materi_selesai', 50, getRelativeDateISO(-1) + 'T17:00:00.000Z');
    insertMastery.run('siswa-10-nadia', 'mtk-trigonometri', 'menguasai', 100, 1);
    insertMastery.run('siswa-10-nadia', 'fisika' === 'fisika' ? 'fis-gerak-lurus' : 'fis-gerak-lurus', 'sedang_belajar', 67, 1);
    insertUserBadge.run('siswa-10-nadia', 'langkah-pertama', getRelativeDateISO(-2) + 'T14:20:00.000Z');
    insertUserBadge.run('siswa-10-nadia', 'penakluk-kuis', getRelativeDateISO(-1) + 'T16:10:00.000Z');
    insertUserBadge.run('siswa-10-nadia', 'api-konsisten', getRelativeDateISO(-1) + 'T17:00:00.000Z');
    insertUserBadge.run('siswa-10-nadia', 'nilai-sempurna', getRelativeDateISO(-1) + 'T16:10:00.000Z');

    // Rafi (Kelas 11) initial progress
    insertCompletion.run('siswa-11-rafi', 'mtk-turunan', now);
    insertXp.run('xp-seed-4', 'siswa-11-rafi', 'matematika', 'materi_selesai', 50, getRelativeDateISO(-1) + 'T10:00:00.000Z');
    insertXp.run('xp-seed-5', 'siswa-11-rafi', 'matematika', 'kuis_selesai', 90, today + 'T09:15:00.000Z');
    insertMastery.run('siswa-11-rafi', 'mtk-turunan', 'menguasai', 85, 1);
    insertUserBadge.run('siswa-11-rafi', 'langkah-pertama', getRelativeDateISO(-1) + 'T10:00:00.000Z');
    insertUserBadge.run('siswa-11-rafi', 'penakluk-kuis', today + 'T09:15:00.000Z');

    // Sinta (Kelas 12) initial progress
    insertCompletion.run('siswa-12-sinta', 'bio-genetika', now);
    insertCompletion.run('siswa-12-sinta', 'bind-argumentasi', now);
    insertXp.run('xp-seed-6', 'siswa-12-sinta', 'biologi', 'kuis_selesai', 150, getRelativeDateISO(-2) + 'T11:00:00.000Z');
    insertXp.run('xp-seed-7', 'siswa-12-sinta', 'bahasa-indonesia', 'kuis_selesai', 140, today + 'T08:00:00.000Z');
    insertMastery.run('siswa-12-sinta', 'bio-genetika', 'menguasai', 100, 1);
    insertMastery.run('siswa-12-sinta', 'bind-argumentasi', 'menguasai', 100, 1);
    insertUserBadge.run('siswa-12-sinta', 'langkah-pertama', getRelativeDateISO(-2) + 'T11:00:00.000Z');
    insertUserBadge.run('siswa-12-sinta', 'api-konsisten', today + 'T08:00:00.000Z');

    // Other students XP so leaderboard has realistic rankings
    insertXp.run('xp-seed-8', 'siswa-10-bima', 'matematika', 'kuis_selesai', 160, today + 'T07:30:00.000Z');
    insertXp.run('xp-seed-9', 'siswa-11-alyssa', 'kimia', 'kuis_selesai', 210, today + 'T08:45:00.000Z');

    // Weekly Leaderboard
    const monday = getMondayDateISO();
    const insertLb = db.prepare(`
      INSERT INTO leaderboard_weekly (minggu, user_id, kelas_id, xp)
      VALUES (?, ?, ?, ?)
    `);
    insertLb.run(monday, 'siswa-10-nadia', '10', 220);
    insertLb.run(monday, 'siswa-10-bima', '10', 160);
    insertLb.run(monday, 'siswa-11-rafi', '11', 140);
    insertLb.run(monday, 'siswa-11-alyssa', '11', 210);
    insertLb.run(monday, 'siswa-12-sinta', '12', 290);
  });

  tx();
}
