// src/services/ContentClassifierService.js
import axios from "axios";

const ML_API = "http://127.0.0.1:5001/predict";

export const classifyContent = async (
  title = "",
  description = "",
  bodyText = "",
  url = "",
  keywords = ""
) => {

  let combinedText = "";

  if (title) combinedText += (title + " ").repeat(2);
  if (keywords) combinedText += keywords.replace(/,/g, " ") + " ";
  if (description) combinedText += description + " ";
  if (bodyText) combinedText += bodyText;

  combinedText = combinedText.trim();

  if (combinedText.length > 5000) {
    combinedText = combinedText.substring(0, 5000);
  }

  // ==================== LOGGING PENTING ====================
  console.log(`\n🔍 [ML INPUT] URL: ${url}`);
  console.log(`📊 Panjang combinedText: ${combinedText.length} karakter`);

  // Cari kata-kata berisiko yang sering muncul di judol
  const riskyWords = ["daftar", "login", "deposit", "withdraw", "slot", "bonus", "jackpot"];
  riskyWords.forEach(word => {
    if (combinedText.toLowerCase().includes(word)) {
      const count = (combinedText.toLowerCase().match(new RegExp(word, "g")) || []).length;
      console.log(`⚠️  Kata berisiko ditemukan: "${word}" (${count} kali)`);
    }
  });

  console.log(`📝 Combined Text (500 karakter pertama):`);
  console.log(combinedText.substring(0, 500) + (combinedText.length > 500 ? "..." : ""));
  console.log("==================================================");
  // =======================================================

  const MAX_RETRIES = 2;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      console.log("[ML] Sending to Flask:", { url });

      const response = await axios.post(
        ML_API,
        {
          text: combinedText,
          url: url,
        },
        { timeout: 15000 }
      );

      const r = response.data;

      console.log("[ML] Response from Flask:", r);

      const confidence = r.confidence ?? 0;
      const isSafe = r.is_safe === true || r.category === "aman";

      return {
        isSafe,
        category: r.category || "unknown",
        confidence: confidence,
        scores: r.all_probabilities || {},
        reason: r.reason || "Tidak ada alasan dari AI",
        errorMessage: isSafe 
          ? undefined 
          : `Terdeteksi sebagai ${r.category?.toUpperCase()}`
      };

    } catch (error) {
      attempts++;
      console.error(`[ML] Attempt ${attempts} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Fallback
  return {
    isSafe: true,
    category: "unknown",
    confidence: 0.5,
    reason: "ML service tidak merespons",
    errorMessage: "ML service timeout"
  };
};