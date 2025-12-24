// src/services/ContentClassifierService.js
import axios from "axios";

// PASTIKAN PORT INI SAMA DENGAN app.py KAMU! (default 5001)
const ML_API = "http://127.0.0.1:5001/classify";

export const classifyContent = async (
  title = "",
  description = "",
  bodyText = "",
  url = ""
) => {
  // Gabungkan semua teks yang ada
  let combinedText = [title, description, bodyText]
    .filter(Boolean)
    .join(" ")
    .trim();

  // === TAMBAHAN: CLEAN TEKS LEBIH BAIK ===
  combinedText = combinedText
    .replace(/\s+/g, " ")   // Ganti multiple whitespace/newline/tab jadi spasi tunggal
    .replace(/[^\w\s.,!?]/g, "") // Hapus karakter aneh (opsional, biar lebih bersih)
    .trim();

  // === TAMBAHAN: LIMIT PANJANG TEKS (maks 5000 karakter) ===
  const MAX_TEXT_LENGTH = 5000;
  if (combinedText.length > MAX_TEXT_LENGTH) {
    combinedText = combinedText.substring(0, MAX_TEXT_LENGTH) + "... [truncated]";
    console.log(`[ML] Teks terlalu panjang, dipotong menjadi ${MAX_TEXT_LENGTH} karakter`);
  }

  // Kalau benar-benar tidak ada konten & URL → anggap aman
  if (!combinedText && !url) {
    return {
      isSafe: true,
      category: "no_content",
      confidence: 1.0,
      scores: {},
    };
  }

  try {
    console.log("[ML] Mengirim request ke Flask untuk klasifikasi...");
    console.log("[ML] URL:", url);
    console.log(`[ML] Panjang teks dikirim: ${combinedText.length} karakter`);
    if (combinedText.length > 0) {
      console.log("[ML] Text snippet:", combinedText.substring(0, 200) + (combinedText.length > 200 ? "..." : ""));
    }

    const response = await axios.post(
      ML_API,
      {
        text: combinedText,
        url: url,
      },
      {
        timeout: 15000, // 15 detik timeout (cukup untuk fetch + predict)
      }
    );

    const r = response.data;

    console.log("[ML] Prediksi dari Flask:", r);

    // Mapping hasil Flask ke format yang diharapkan controller
    return {
      isSafe: r.is_safe === true, // pastikan boolean
      category: r.category || "unknown",
      confidence: r.confidence ?? 0,
      scores: r.all_probabilities || {},
    };
  } catch (error) {
    // === ERROR HANDLING: JANGAN PERNAH BLOKIR KALAU FLASK GAGAL ===
    console.error("[ML] GAGAL menghubungi Flask ML Service:");
    
    if (error.code) {
      console.error(`[ML] Error code: ${error.code}`); // ECONNREFUSED, ENOTFOUND, dll.
    }
    if (error.response) {
      console.error(`[ML] Status: ${error.response.status} | Data:`, error.response.data);
    } else {
      console.error(`[ML] Message: ${error.message}`);
    }

    console.warn("[ML] Fallback: Menganggap link AMAN karena layanan ML tidak tersedia (fail-open).");

    // Fail-open: Izinkan link supaya user tetap bisa create shortlink
    return {
      isSafe: true,
      category: "ml_service_unavailable",
      confidence: 0.5,
      scores: {},
    };
  }
};