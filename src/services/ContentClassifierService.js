// src/services/ContentClassifierService.js
// VERSI DIPERKUAT — Fail-Safe & Threshold Confidence

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
    console.log("=== Sending to Flask API ===");
    console.log("URL:", url);
    console.log("Text (first 200 chars):", text.substring(0, 200));

    // 1. Coba panggil Flask API
    const response = await axios.post(
      ML_API,
      { text, url },
      { timeout: 10000 } // Timeout 10 detik (jangan terlalu lama menunggu)
    );

    const r = response.data;

    console.log("Flask API Response:", r);

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
    // 3. JIKA FLASK ERROR / OFFLINE / TIMEOUT
    console.error(
      "⚠️ CRITICAL: ML Service (Python) Gagal Dihubungi:",
      error.message
    );

    // PERUBAHAN PENTING: JIKA SISTEM ERROR, ANG GAPTEK BISA JAHAT
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