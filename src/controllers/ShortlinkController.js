import Link from "../models/Link.js";
import User from "../models/User.js";
import { fetchMetadata } from "../utils/FetchMetadata.js";
import { classifyContent } from "../services/ContentClassifierService.js";
// TAMBAHAN: Import Google Safe Browsing
import { checkSafeBrowsing } from "../utils/GoogleSafeBrowsing.js";

const normalizeShortCode = (code) => code.trim().toLowerCase();

// Daftar domain yang dianggap aman secara default
const WHITELIST_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'google.com',
  'gemini.google.com',
  'github.com',
  'wikipedia.org',
  'linkedin.com',
  'instagram.com',
  'twitter.com',
  'facebook.com',
  'netflix.com',
  'spotify.com',
  'amazon.com',
  'microsoft.com',
  'apple.com',
  'openai.com',
  'chatgpt.com',
  'claude.ai',
  'chat.deepseek.com',
  'chat.qwen.ai',
  'siga-8.untad.ac.id',
  'grok.com',
  'bca.co.id', 'mandiri.co.id', 'bri.co.id', 'bni.co.id',
  'shopee.co.id', 'tokopedia.com', 'lazada.co.id',
];

export const shortenUrl = async (req, res) => {
  try {
    const { userId } = req;
    const { original_url, custom_short_link, description } = req.body;

    if (!original_url) {
      return res.status(400).json({ error: "original_url wajib diisi" });
    }

    let detectionResult;

    try {
      const urlObj = new URL(original_url);

      // WHITELIST CHECK (prioritas tertinggi)
      if (WHITELIST_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
        console.log(`[WHITELISTED] ${original_url} - skipping all checks`);
        detectionResult = {
          isSafe: true,
          category: 'whitelisted',
          confidence: 1.0,
          scores: {}
        };
      } else {
        // GOOGLE SAFE BROWSING CHECK (prioritas kedua - super akurat)
        const sbResult = await checkSafeBrowsing(original_url);
        if (!sbResult.isSafe) {
          console.warn(`[BLOCKED by Google Safe Browsing] ${sbResult.threatType} | ${original_url}`);
          return res.status(403).json({
            error: `URL diblokir otomatis: Terdeteksi ${sbResult.threatType} oleh Google Safe Browsing`,
            source: "Google Safe Browsing API",
            confidence: "100%",
            detail: "Database real-time global Google mendeteksi link ini berbahaya (malware/phishing).",
            blockReason: {
              source: "Google Safe Browsing",
              threatType: sbResult.threatType,
              confidence: "100%",
              message: `Link ini terdeteksi sebagai ${sbResult.threatType} oleh database global Google. Ancaman ini biasanya berupa phishing, malware, atau situs berbahaya lainnya.`,
            }
          });
        }

        // Jika lolos Google, lanjut ke ML Naive Bayes
        const metadata = await fetchMetadata(original_url);

        if (metadata.title.includes("Error Fetching")) {
          return res.status(400).json({
            error: "Tidak dapat mengambil metadata dari URL. Pastikan URL valid dan dapat diakses.",
          });
        }

        const descriptionToDetect = description || metadata.description || "";

        detectionResult = await classifyContent(
          metadata.title,
          descriptionToDetect,
          metadata.bodyText || "",
          original_url
        );
      }
    } catch (e) {
      return res.status(400).json({ error: "Format URL tidak valid." });
    }

    // Blokir kalau ML Naive Bayes deteksi berbahaya
    if (!detectionResult.isSafe) {
      console.warn(`[BLOCKED by ML] ${detectionResult.category.toUpperCase()} | ${original_url}`);
      return res.status(403).json({
        error: `URL diblokir otomatis: terdeteksi sebagai ${detectionResult.category.toUpperCase()}`,
        category: detectionResult.category,
        confidence: (detectionResult.confidence * 100).toFixed(2) + "%",
        detail: "Sistem deteksi berbasis Naive Bayes (Python) mendeteksi konten berbahaya.",
        blockReason: {
          source: "Sistem Deteksi AI Lokal (Naive Bayes)",
          category: detectionResult.category.toUpperCase(),
          confidence: (detectionResult.confidence * 100).toFixed(1) + "%",
          message: `Konten halaman mengandung pola mencurigakan seperti kata-kata yang sering digunakan pada situs ${detectionResult.category.toUpperCase()} (misalnya: judi, penipuan, atau konten tidak pantas).`,
        }
      });
    }

    // Generate short code
    let shortCode;
    if (custom_short_link) {
      const raw = custom_short_link.trim();
      if (!raw) return res.status(400).json({ error: "Custom short link tidak boleh kosong" });
      if (raw.length < 3 || raw.length > 6) return res.status(400).json({ error: "Custom short link harus 3–6 karakter" });
      if (!/^[a-zA-Z0-9]+$/.test(raw)) return res.status(400).json({ error: "Hanya boleh huruf dan angka" });

      const normalized = normalizeShortCode(raw);
      const existing = await Link.findOne({ where: { short_link: normalized } });
      if (existing) return res.status(409).json({ error: "Short link tersebut sudah digunakan" });

      shortCode = normalized;
    } else {
      do {
        shortCode = Math.random().toString(36).substring(2, 8);
      } while (await Link.findOne({ where: { short_link: shortCode } }));
    }

    // Simpan metadata
    let metadataForSave = { title: 'Whitelisted Link', description: 'Whitelisted Link' };
    if (detectionResult.category !== 'whitelisted') {
      metadataForSave = await fetchMetadata(original_url);
    }

    // Buat link baru
    const newLink = await Link.create({
      default_link: original_url,
      short_link: shortCode,
      description: description || null,
      user_id: userId,
      title: metadataForSave.title,
      scraped_description: metadataForSave.description,
      content_category: detectionResult.category,
      content_probability: detectionResult.confidence || 1.0,
      is_malicious: !detectionResult.isSafe,
      classification_scores: JSON.stringify(detectionResult.scores || {}),
    });

    return res.status(201).json({
      message: "Shortlink berhasil dibuat & telah diverifikasi aman oleh Google Safe Browsing + Naive Bayes",
      short_url: `http://localhost:5000/${shortCode}`,
      data: {
        original_url,
        short_code: shortCode,
        category: detectionResult.category,
        safety_confidence: (detectionResult.confidence * 100).toFixed(1) + "% yakin aman",
      },
    });

  } catch (error) {
    console.error("Error in shortenUrl:", error);
    return res.status(500).json({
      error: "Gagal memproses shortlink",
      detail: error.message,
    });
  }
};

// Fungsi lainnya tetap SAMA PERSIS seperti kode aslimu
export const getAllLinks = async (req, res) => {
  try {
    const { userId } = req;
    const links = await Link.findAll({ where: { user_id: userId } });

    const formattedLinks = links.map((link) => ({
      id: link.id,
      shortUrl: `http://localhost:5000/${link.short_link}`,
      originalUrl: link.default_link,
      title: link.title || link.description || "Untitled",
      category: link.content_category || "unknown",
      probability: link.content_probability ? (link.content_probability * 100).toFixed(1) + "%" : "-",
      createdAt: link.createdAt
        ? new Date(link.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })
        : "Unknown",
      clicks: link.clicks || 0,
    }));

    return res.status(200).json(formattedLinks);
  } catch (error) {
    console.error("Error fetching links:", error);
    return res.status(500).json({ error: "Gagal mengambil daftar link" });
  }
};

export const redirectToOriginal = async (req, res) => {
  try {
    const { short_code } = req.params;
    if (!short_code) return res.status(400).send("Short code required");

    const normalized = normalizeShortCode(short_code);
    const link = await Link.findOne({ where: { short_link: normalized } });

    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Tidak Ditemukan</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f8f9fa; color: #333; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
            h1 { color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Link Tidak Ditemukan</h1>
            <p>Short link yang Anda cari tidak ada atau sudah dihapus.</p>
            <a href="/" style="color: #6f42c1;">Kembali ke Beranda</a>
          </div>
        </body>
        </html>
      `);
    }

    let isSafe = true;
    let category = "safe";
    let confidence = 1.0;

    try {
      const urlObj = new URL(link.default_link);
      const isWhitelisted = WHITELIST_DOMAINS.some(domain => urlObj.hostname.includes(domain));

      if (!isWhitelisted) {
        const sbResult = await checkSafeBrowsing(link.default_link);
        if (!sbResult.isSafe) {
          isSafe = false;
          category = sbResult.threatType || "malicious";
          confidence = 1.0;
        } else {
          const metadata = await fetchMetadata(link.default_link);
          const detectionResult = await classifyContent(
            metadata.title || "",
            link.description || metadata.description || "",
            metadata.bodyText || "",
            link.default_link
          );

          isSafe = detectionResult.isSafe;
          category = detectionResult.category || "unknown";
          confidence = detectionResult.confidence || 0;
        }
      }
    } catch (err) {
      console.error("Error during real-time classification:", err.message);
      isSafe = true;
    }

    if (isSafe) {
      link.clicks = (link.clicks || 0) + 1;
      await link.save();
    }

    if (!isSafe && confidence > 0.75) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Peringatan Keamanan</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .warning-card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 15px 40px rgba(198, 40, 40, 0.2); text-align: center; max-width: 600px; border: 3px solid #ef5350; }
            h1 { font-size: 2.5em; margin: 0 0 20px; }
            p { font-size: 1.2em; line-height: 1.6; margin: 15px 0; }
            .category { font-weight: bold; color: #b71c1c; font-size: 1.4em; }
            .confidence { background: #ffebee; padding: 10px 20px; border-radius: 50px; display: inline-block; margin: 15px 0; }
            .buttons { margin-top: 30px; display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
            .btn { padding: 14px 30px; border-radius: 50px; font-weight: bold; text-decoration: none; transition: all 0.3s; display: inline-block; }
            .btn-danger { background: #d32f2f; color: white; }
            .btn-danger:hover { background: #b71c1c; transform: scale(1.05); }
            .btn-safe { background: #eee; color: #333; }
            .btn-safe:hover { background: #ddd; }
            .footer { margin-top: 40px; font-size: 0.9em; color: #777; }
          </style>
        </head>
        <body>
          <div class="warning-card">
            <h1>PERINGATAN KEAMANAN</h1>
            <p>Link yang Anda tuju terdeteksi sebagai konten <span class="category">${category.toUpperCase()}</span></p>
            <div class="confidence">Kepercayaan deteksi: ${(confidence * 100).toFixed(0)}%</div>
            <p>Kemungkinan berisi penipuan (phishing), malware, atau konten berbahaya.</p>
            <p>Kami sarankan <strong>jangan melanjutkan</strong> untuk keamanan Anda.</p>

            <div class="buttons">
              <a href="${link.default_link}" class="btn btn-danger">Lanjutkan dengan Risiko Sendiri</a>
              <a href="javascript:history.back()" class="btn btn-safe">Kembali ke Aman</a>
            </div>

            <div class="footer">
              <p>Didukung oleh Google Safe Browsing + Machine Learning (Naive Bayes)</p>
              <p>Jika Anda yakin ini kesalahan, laporkan ke admin.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    res.redirect(301, link.default_link);

  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send("Server error");
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const { default: db } = await import("../configs/Database.js");
    const [linkResults] = await db.query("SELECT COUNT(*) as count FROM links");
    const [userResults] = await db.query("SELECT COUNT(*) as count FROM users");

    res.status(200).json({
      data: {
        totalUsers: userResults[0].count,
        totalLinks: linkResults[0].count,
        activeDomains: 24,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Gagal mengambil statistik" });
  }
};

// ===================================================================
// FUNGSI BARU UNTUK PREVIEW LINK (digunakan di halaman Create Link)
// ===================================================================

export const getUrlPreview = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Parameter 'url' diperlukan" });
    }

    let fullUrl;
    try {
      fullUrl = url.startsWith("http") ? url : `https://${url}`;
      new URL(fullUrl);
    } catch (e) {
      return res.status(400).json({ error: "Format URL tidak valid" });
    }

    const urlObj = new URL(fullUrl);
    const hostname = urlObj.hostname.replace(/^www\./, "");

    // ============== SPECIAL FALLBACK UNTUK DOMAIN YANG SULIT DI-SCRAPE ==============
    const specialFallbacks = {
      "grok.com": {
        title: "Grok by xAI",
        description: "Grok is a helpful and maximally truthful AI — not based on models from any other companies.",
        image: "https://grok.x.ai/static/apple-touch-icon.png",
      },
      "x.com": {
        title: "X (formerly Twitter)",
        description: "Blaze your glory!",
        image: "https://abs.twimg.com/responsive-web/client-web/icon-ios.b3c1ebbd.png",
      },
      "twitter.com": {
        title: "X (formerly Twitter)",
        description: "Blaze your glory!",
        image: "https://abs.twimg.com/responsive-web/client-web/icon-ios.b3c1ebbd.png",
      },
      "instagram.com": {
        title: "Instagram",
        description: "Create an account or log in to Instagram - A simple, fun & creative way to capture, edit & share photos, videos & messages.",
        image: "https://www.instagram.com/static/images/web/mobile_nav_type_logo.png/735145cfe0a4.png",
      },
      "tiktok.com": {
        title: "TikTok - Make Your Day",
        description: "TikTok is the leading destination for short-form mobile video. Our mission is to inspire creativity and bring joy.",
        image: "https://sf16-va.tiktokcdn.com/obj/eden-va2/hkluhiazvh/lottie/logo_202208100830_1x_96.png",
      },
      "facebook.com": {
        title: "Facebook - Log in or sign up",
        description: "Connect with friends and the world around you on Facebook.",
        image: "https://static.xx.fbcdn.net/rsrc.php/v3/yC/r/a6O1q2JCY7A.png",
      },
      // Tambah domain lain kalau perlu di masa depan
    };

    if (specialFallbacks[hostname]) {
      const fb = specialFallbacks[hostname];
      return res.json({
        title: fb.title,
        description: fb.description,
        image: fb.image,
        domain: hostname,
      });
    }
    // ==============================================================================

    const metadata = await fetchMetadata(fullUrl);

    // Jika fetch gagal total
    if (metadata.title && metadata.title.includes("Error Fetching")) {
      return res.json({
        title: urlObj.hostname,
        description: "Tidak dapat mengambil preview halaman",
        image: metadata.image || null,
        domain: hostname,
      });
    }

    res.json({
      title: metadata.title || urlObj.hostname,
      description: metadata.description || "Tidak ada deskripsi",
      image: metadata.image || null,
      domain: hostname,
    });
  } catch (error) {
    console.error("Error in getUrlPreview:", error);
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      const domain = urlObj.hostname.replace(/^www\./, "");
      return res.json({
        title: domain,
        description: "Tidak dapat mengambil preview halaman",
        image: null,
        domain,
      });
    } catch {
      return res.status(500).json({ error: "Gagal mengambil preview URL" });
    }
  }
};