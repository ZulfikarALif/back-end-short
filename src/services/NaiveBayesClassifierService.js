// // src/services/NaiveBayesClassifierService.js
// class NaiveBayesClassifier {
//   constructor() {
//     this.vocab = new Set();
//     this.wordCount = {};
//     this.categoryCount = {};
//     this.totalDocuments = 0;
//     this.categories = new Set();
//     this.alpha = 1;
//   }

//   _preprocess(text = "") {
//     return text
//       .toLowerCase()
//       .replace(/[^a-z0-9\s]/g, " ") // Hapus simbol 
//       .split(/\s+/)
//       .filter((w) => w.length > 2);
//   }

//   train(dataset) {
//     dataset.forEach(({ text, label }) => {
//       if (!text || !label) return;
//       this.categories.add(label);
//       this.categoryCount[label] = (this.categoryCount[label] || 0) + 1;
//       this.totalDocuments++;

//       this._preprocess(text).forEach((word) => {
//         this.vocab.add(word);
//         this.wordCount[label] = this.wordCount[label] || {};
//         this.wordCount[label][word] = (this.wordCount[label][word] || 0) + 1;
//       });
//     });
//     console.log(
//       `Naive Bayes Training Selesai! ${this.totalDocuments} dokumen, ${this.vocab.size} kata unik`
//     );
//   }

//   classify(title = "", description = "", bodyText = "", original_url = "") {
//     const text = `${title} ${description} ${bodyText}`;
//     const words = this._preprocess(text);
//     const urlLower = original_url.toLowerCase();

//     // ============================================================
//     // 1. WHITELIST (Jalur Hijau)
//     // ============================================================
//     const SAFE_DOMAINS = [
//       "youtube.com",
//       "youtu.be",
//       "google.com",
//       "gmail.com",
//       "github.com",
//       "stackoverflow.com",
//       "wikipedia.org",
//       "instagram.com",
//       "facebook.com",
//       "twitter.com",
//       "x.com",
//       "linkedin.com",
//       "tiktok.com",
//       "shopee.co.id",
//       "tokopedia.com",
//       "gojek.com",
//       "grok.com",
//       "x.ai",
//       "localhost",
//     ];

//     if (SAFE_DOMAINS.some((d) => urlLower.includes(d))) {
//       return {
//         category: "safe",
//         probability: 1.0,
//         isSafe: true,
//         scores: { safe: 1.0 },
//       };
//     }

//     // ============================================================
//     // 2. URL KEYWORD CHECK (Jalur Merah - Hard Block)
//     // PERBAIKAN: Ini dijalankan SELALU, tidak peduli ada teks atau tidak.
//     // ============================================================
//     const gamblingKeywords = [
//       "slot",
//       "gacor",
//       "judi",
//       "togel",
//       "casino",
//       "poker",
//       "bet",
//       "win",
//       "jackpot",
//       "zeus",
//       "pragmatic",
//       "hoki",
//       "88",
//       "303",
//       "vip",
//       "maxwin",
//       "rtp",
//       "depo",
//     ];
//     const adultKeywords = [
//       "bokep",
//       "porno",
//       "sex",
//       "xxx",
//       "nude",
//       "tube",
//       "hentai",
//     ];
//     const phishingKeywords = ["login-", "verify", "dana-kaget", "bonus-"];

//     // Cek Gambling
//     if (gamblingKeywords.some((kw) => urlLower.includes(kw))) {
//       // Deteksi ganda untuk kata pendek seperti '88' atau 'bet' agar tidak salah tangkap (misal: alphabet)
//       // Tapi untuk 'slot', 'gacor', 'judi' langsung hajar.
//       const strongKeywords = ["slot", "gacor", "judi", "togel", "casino"];
//       const isStrongMatch = strongKeywords.some((k) => urlLower.includes(k));

//       // Jika match kuat ATAU match kombinasi (misal slot + 88)
//       if (
//         isStrongMatch ||
//         (urlLower.includes("88") && urlLower.includes("vip"))
//       ) {
//         return {
//           category: "gambling",
//           probability: 0.99,
//           isSafe: false,
//           scores: { gambling: 0.99 },
//         };
//       }
//     }

//     // Cek Adult
//     if (adultKeywords.some((kw) => urlLower.includes(kw))) {
//       return {
//         category: "adult",
//         probability: 0.99,
//         isSafe: false,
//         scores: { adult: 0.99 },
//       };
//     }

//     // ============================================================
//     // 3. NAIVE BAYES (Analisis Konten Teks)
//     // ============================================================

//     // Jika tidak ada kata yang bisa dianalisis, dan lolos keyword URL,
//     // kita anggap suspect (unknown) atau safe tergantung kebijakan.
//     // Disini kita default safe tapi dengan probability rendah jika kosong.
//     if (words.length === 0) {
//       return {
//         category: "safe",
//         probability: 0.5,
//         isSafe: true,
//         scores: { safe: 0.5 },
//       };
//     }

//     let bestCategory = "safe";
//     let bestScore = -Infinity;
//     const scores = {};

//     for (const cat of this.categories) {
//       // Hitung probabilitas prior P(Category)
//       let logProb = Math.log(
//         (this.categoryCount[cat] || 1) / (this.totalDocuments || 1)
//       );

//       // Hitung likelihood P(Word|Category)
//       words.forEach((word) => {
//         const count = (this.wordCount[cat]?.[word] || 0) + this.alpha;
//         const total =
//           Object.values(this.wordCount[cat] || {}).reduce((a, b) => a + b, 0) +
//           this.alpha * this.vocab.size;
//         logProb += Math.log(count / total);
//       });

//       scores[cat] = logProb;
//       if (logProb > bestScore) {
//         bestScore = logProb;
//         bestCategory = cat;
//       }
//     }

//     // Normalisasi skor ke persentase (Softmax sederhana)
//     const exp = Object.fromEntries(
//       Object.entries(scores).map(([c, s]) => [c, Math.exp(s)])
//     );
//     const sum = Object.values(exp).reduce((a, b) => a + b, 1e-10);
//     const probabilities = Object.fromEntries(
//       Object.entries(exp).map(([c, v]) => [c, v / sum])
//     );
//     const probability = probabilities[bestCategory] || 0;

//     const isSafe = bestCategory === "safe";

//     return {
//       category: bestCategory,
//       probability: parseFloat(probability.toFixed(4)),
//       isSafe,
//       scores: Object.fromEntries(
//         Object.entries(probabilities).map(([k, v]) => [
//           k,
//           parseFloat(v.toFixed(4)),
//         ])
//       ),
//     };
//   }
// }

// // DATASET TAMBAHAN (Wajib diperkaya agar Naive Bayes lebih pintar)
// const trainingData = [
//   // SAFE
//   { text: "Belajar React JS tutorial lengkap coding", label: "safe" },
//   { text: "Resep makanan sehat dan enak masakan", label: "safe" },
//   { text: "Lowongan kerja programmer Jakarta linkedin", label: "safe" },
//   { text: "Berita terkini politik ekonomi indonesia", label: "safe" },

//   // PHISHING
//   { text: "Login Shopee verifikasi akun sekarang", label: "phishing" },
//   { text: "Akun Facebook Anda dinonaktifkan security", label: "phishing" },
//   { text: "Dana kaget klaim saldo gratis", label: "phishing" },

//   // ADULT
//   { text: "Video bokep indo terbaru no sensor", label: "adult" },
//   { text: "Situs porno gratis streaming hot", label: "adult" },
//   { text: "Dewasa 18+ only konten seks", label: "adult" },

//   // GAMBLING (Perbanyak di sini karena kasusmu 'slot')
//   { text: "Slot gacor hari ini deposit pulsa", label: "gambling" },
//   { text: "Judi online terpercaya bonus new member", label: "gambling" },
//   { text: "Togel Singapore prediksi jitu 4D", label: "gambling" },
//   { text: "Agen bola parlay murah gacor", label: "gambling" },
//   { text: "Casino online slot pragmatic play zeus", label: "gambling" },
//   { text: "RTP tinggi maxwin anti rungkad", label: "gambling" }, // Tambahan vocabulary
//   { text: "Situs bet 88 vip link alternatif", label: "gambling" }, // Tambahan vocabulary

//   // SCAM & MALWARE
//   { text: "Dapatkan iPhone gratis isi survey", label: "scam" },
//   { text: "Pinjaman online cepat cair tanpa KTP", label: "scam" },
//   { text: "Download APK Mod WhatsApp premium gratis", label: "malware" },
//   { text: "Crack software Adobe Photoshop full version", label: "malware" },
// ];

// const classifier = new NaiveBayesClassifier();
// classifier.train(trainingData);

// export default classifier;
