// src/services/ContentClassifierService.js

// Kata kunci berbahaya berdasarkan kategori
const BAD_KEYWORDS = {
  gambling: [
    "kasino",
    "slot online",
    "judi",
    "togel",
    "bola tangkas",
    "poker online",
    "betting",
    "casino",
    "bet",
    "win",
    "jackpot",
    "main judi",
    "agen judi",
    "raja judi",
    "situs judi",
    "taruhan",
    "uang asli",
    "bonus besar",
    "daftar sekarang",
    "keberuntungan",
  ],
  phishing: [
    "login sekarang",
    "akun anda diblokir",
    "verifikasi segera",
    "klik sekarang",
    "penipuan",
    "hack akun",
    "carding",
    "phishing",
    "data pribadi",
    "password anda",
    "rekening anda",
    "peringatan keamanan",
    "aktivitas mencurigakan",
    "akun dinonaktifkan",
  ],
  adult: [
    "dewasa",
    "porno",
    "seks",
    "vulgar",
    "erotik",
    "bokep",
    "sex",
    "hot",
    "nude",
    "desah",
    "memek",
    "kontol",
    "coli",
    "masturbasi",
    "bugil",
    "telanjang",
    "panas",
    "dada",
    "pantat",
    "intim",
    "ranjang",
    "sensual",
    "gairah",
    "liar",
    "dewasa 18+",
    "dewasa 21+",
  ],
  malware: [
    "unduh sekarang",
    "install aplikasi",
    "klik link ini",
    "file berbahaya",
    "virus",
    "malware",
    "keamanan terganggu",
    "klik untuk aman",
    "update sekarang",
    "scan virus",
    "rootkit",
    "trojan",
    "keylogger",
    "spyware",
    "adware",
    "rantai perangkat lunak",
  ],
};

/**
 * Klasifikasi konten berdasarkan title dan description
 * @param {string} title - Judul halaman
 * @param {string} description - Deskripsi halaman
 * @returns {Object} - { isSafe: boolean, category: string, message: string, probability: number }
 */
export const classifyContent = (
  title,
  description,
  bodyText = "",
  url = ""
) => {
  // Gabungkan semua teks untuk analisis, termasuk URL
  const content = `${title} ${description} ${bodyText} ${url}`.toLowerCase();
  let detectedCategory = null;
  let maxScore = 0;

  for (const [category, keywords] of Object.entries(BAD_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category;
    }
  }

  // Jika tidak ada kata kunci yang cocok, anggap aman
  if (!detectedCategory) {
    return {
      isSafe: true,
      category: "safe",
      message: "Tautan aman dari konten berbahaya.",
      probability: 0,
    };
  }

  // Semakin banyak kata kunci cocok, semakin tinggi probabilitas
  const probability = Math.min(
    maxScore / BAD_KEYWORDS[detectedCategory].length,
    1
  );

  // Jika probabilitas >= 0.5, anggap berbahaya
  const isSafe = probability < 0.5;

  return {
    isSafe,
    category: detectedCategory,
    message: `Konten terdeteksi sebagai ${detectedCategory}.`,
    probability: parseFloat(probability.toFixed(2)),
  };
};
