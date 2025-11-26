import axios from "axios";
import * as cheerio from "cheerio";
// import https from 'https';

/**
 * Mengambil metadata (title, description, dan isi halaman/bodyText) dari URL.
 * bodyText digunakan untuk analisis konten keamanan (Judi, Dewasa, dll.)
 * @param {string} url - URL target
 * @returns {Promise<{ title: string, description: string, bodyText: string }>}
 */
export const fetchMetadata = async (url) => {
  try {
    // Tambahkan timeout 5 detik agar scraping tidak menggantung terlalu lama
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        // Gunakan User-Agent agar tidak diblokir oleh beberapa server
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // --- 1. Ambil Title ---
    let title = $("title").text().trim();
    if (!title) {
      title = $('meta[property="og:title"]').attr("content") || "";
    }

    // --- 2. Ambil Description ---
    let description = $('meta[name="description"]').attr("content") || "";
    if (!description) {
      description = $('meta[property="og:description"]').attr("content") || "";
    }

    // Fallback: Jika tidak ada meta description, ambil teks dari paragraf
    if (!description) {
      const paragraphs = $("p")
        .map((i, el) => $(el).text().trim())
        .get();
      for (const p of paragraphs) {
        if (p.length > 50) {
          description = p.substring(0, 200) + (p.length > 200 ? "..." : ""); // Batasi 200 karakter
          break;
        }
      }
    }

    // --- 3. Ambil Body Text (Konten utama untuk Analisis Keamanan) ---

    // Hapus script, style, dan noscript tags agar bodyText lebih bersih dari kode
    $("script, style, noscript").remove();

    let bodyText = $("body").text().trim();

    // Bersihkan whitespace berlebih, newlines, dan tabs menjadi satu spasi
    bodyText = bodyText.replace(/[\n\t\r]+/g, " ").replace(/\s\s+/g, " ");

    // Batasi agar tidak terlalu panjang untuk analisis model, cukup 1500 karakter awal
    if (bodyText.length > 1500) {
      bodyText =
        bodyText.substring(0, 1500) + "... [text truncated for analysis]";
    }

    return {
      title: title || "No Title Found",
      description: description || "No Description Found",
      bodyText: bodyText || "No Body Text Found",
    };
  } catch (error) {
    // Tangani error seperti koneksi gagal, DNS error, atau timeout
    console.warn(`Gagal mengambil metadata dari ${url}:`, error.message);
    // Mengembalikan objek error agar controller bisa menangkapnya
    return {
      title: "Error Fetching - Check URL",
      description: "Error Fetching - Check URL",
      bodyText: "Error Fetching - Check URL",
    };
  }
};
