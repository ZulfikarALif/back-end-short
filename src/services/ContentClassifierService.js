// src/services/ContentClassifierService.js
// VERSI FINAL (FAIL-SAFE) — Jika Python Error, Link DITOLAK.

import axios from "axios";

const ML_API = "http://127.0.0.1:5000/classify"; // Flask Python kamu

export const classifyContent = async (
  title = "",
  description = "",
  bodyText = "",
  url = ""
) => {
  // Gabungkan semua teks yang tersedia
  const text = [title, description, bodyText].filter(Boolean).join(" ").trim();

  // Validasi awal: Kalau teks dan url kosong, anggap aman (atau bisa ditolak juga tergantung kebijakan)
  if (!text && !url) {
    return {
      isSafe: true,
      category: "safe",
      probability: 0,
      confidence: 1.0,
      message: "Tidak ada konten untuk dianalisis",
      scores: {},
    };
  }

  try {
    // 1. Coba panggil Flask API
    const response = await axios.post(
      ML_API,
      { text, url },
      { timeout: 5000 } // Timeout 5 detik (jangan terlalu lama menunggu)
    );

    const r = response.data;

    // 2. Jika sukses terhubung, kembalikan hasil prediksi Flask
    return {
      isSafe: r.is_safe,
      category: r.category || "unknown",
      probability: 1 - r.confidence,
      confidence: r.confidence,
      message: `Naive Bayes: ${r.category.toUpperCase()} (${(
        r.confidence * 100
      ).toFixed(1)}% yakin)`,
      scores: r.all_probabilities || {},
    };
  } catch (error) {
    // 3. JIKA FLASK ERROR / OFFLINE
    console.error(
      "⚠️ CRITICAL: ML Service (Python) Gagal Dihubungi:",
      error.message
    );

    // PERUBAHAN PENTING DI SINI:
    // Kembalikan isSafe: FALSE agar ShortlinkController MEMBLOKIR request.
    return {
      isSafe: false, // <--- DIBLOKIR KARENA SISTEM DETEKSI MATI
      category: "system_error",
      probability: 1.0,
      confidence: 0.0,
      message:
        "Layanan keamanan sedang offline. Link diblokir sementara demi keamanan.",
      scores: {},
    };
  }
};
