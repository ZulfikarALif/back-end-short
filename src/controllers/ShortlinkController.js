import Link from "../models/Link.js";
import { fetchMetadata } from "../utils/FetchMetadata.js";
import { classifyContent } from "../services/ContentClassifierService.js";

const normalizeShortCode = (code) => code.trim().toLowerCase();

// ────────────────────────────────────────────
// shortenUrl: Buat shortlink + verifikasi keamanan
// ────────────────────────────────────────────
export const shortenUrl = async (req, res) => {
  try {
    const { userId } = req;
    const { original_url, custom_short_link, description } = req.body;

    if (!original_url) {
      return res.status(400).json({ error: "original_url wajib diisi" });
    }

    // ✅ FIX 1: pastikan URL ada https
    let urlToCheck = original_url;
    if (!/^https?:\/\//i.test(urlToCheck)) {
      urlToCheck = "https://" + urlToCheck;
    }

    let detectionResult = {
      isSafe: true,
      category: "unknown",
      confidence: 0,
      scores: {}
    };

    try {
      const urlObj = new URL(urlToCheck);

      // =========================
      // 1. FETCH METADATA (AMAN)
      // =========================
      let metadata;
      try {
        metadata = await fetchMetadata(urlToCheck);
      } catch (err) {
        console.warn("Metadata gagal, lanjut tanpa metadata");
        metadata = {};
      }

      // =========================
      // 2. CLASSIFY (ML)
      // =========================
      const textToClassify =
        description ||
        metadata.description ||
        "";

      detectionResult = await classifyContent(
        metadata.title || "",
        textToClassify,
        metadata.bodyText || "",
        urlToCheck,
        metadata.keywords || ""
      );

      // =========================
      // 🔥 FIX 2: LOGIKA BLOCK YANG BENAR
      // =========================
      const shouldBlock =
        detectionResult.category !== "aman" &&
        detectionResult.confidence >= 0.4;

      if (shouldBlock) {
        console.warn(
          `[BLOCKED by ML] ${detectionResult.category.toUpperCase()} | ${original_url}`
        );

        return res.status(403).json({
  error: `URL diblokir: ${detectionResult.category.toUpperCase()}`,
  category: detectionResult.category,
  confidence: (detectionResult.confidence * 100).toFixed(1) + "%",
  blockReason: {
    source: "Naive Bayes",
    category: detectionResult.category.toUpperCase(),
    confidence: (detectionResult.confidence * 100).toFixed(1) + "%",
    message: "Terdeteksi konten berisiko tinggi"
  },
  reason: detectionResult.reason   
});
      }
    } catch (e) {
      console.error("Error validasi URL:", e.message);
      return res.status(400).json({ error: "Format URL tidak valid." });
    }

    // =========================
    // 3. GENERATE SHORT CODE
    // =========================
    let shortCode;

    if (custom_short_link) {
      const raw = custom_short_link.trim();

      if (raw.length < 3 || raw.length > 6) {
        return res.status(400).json({
          error: "Custom slug 3–6 karakter"
        });
      }

      if (!/^[a-zA-Z0-9]+$/.test(raw)) {
        return res.status(400).json({
          error: "Hanya huruf dan angka"
        });
      }

      const normalized = normalizeShortCode(raw);

      const existing = await Link.findOne({
        where: { short_link: normalized }
      });

      // 🔥 FIX 3: kalau bentrok → auto generate
      if (existing) {
        console.warn("Slug sudah dipakai, generate otomatis");

        do {
          shortCode = Math.random()
            .toString(36)
            .substring(2, 8);
        } while (
          await Link.findOne({
            where: { short_link: shortCode }
          })
        );
      } else {
        shortCode = normalized;
      }
    } else {
      do {
        shortCode = Math.random()
          .toString(36)
          .substring(2, 8);
      } while (
        await Link.findOne({
          where: { short_link: shortCode }
        })
      );
    }

    // =========================
    // 4. SIMPAN METADATA
    // =========================
    let metadataForSave = {
      title: "Link Aman",
      description: "Link diverifikasi"
    };

    try {
      const freshMetadata = await fetchMetadata(urlToCheck);
      metadataForSave = freshMetadata;
    } catch {
      console.warn("Metadata save gagal, pakai default");
    }

    // =========================
    // 5. SIMPAN KE DB
    // =========================
    const newLink = await Link.create({
  default_link: original_url,
  short_link: shortCode,
  description: description || null,
  user_id: userId,
  title: metadataForSave.title,
  scraped_description: metadataForSave.description,
  body_text: metadataForSave.bodyText || null,
  content_category: detectionResult.category,
  content_probability: detectionResult.confidence || 0,
  is_malicious: false,
  classification_scores: JSON.stringify(detectionResult.scores || {}),
  detection_reason: detectionResult.reason   // 🔥 TAMBAH DI SINI
});

    return res.status(201).json({
      message: "Shortlink berhasil dibuat",
      short_url: `http://localhost:5000/${shortCode}`,
      data: {
  original_url,
  short_code: shortCode,
  category: detectionResult.category,
  confidence: (detectionResult.confidence * 100).toFixed(1) + "%",
  reason: detectionResult.reason
}
    });
  } catch (error) {
    console.error("Error shortenUrl:", error.message);
    return res.status(500).json({
      error: "Gagal membuat shortlink"
    });
  }
};

// ─────────────────────────────────────────────
// redirectToOriginal – hanya pakai ML (tanpa Google)
// ─────────────────────────────────────────────
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
            body { font-family:Arial,sans-serif;background:#f8f9fa;color:#333;display:flex;align-items:center;justify-content:center;height:100vh;margin:0; }
            .card { background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);text-align:center;max-width:500px; }
            h1 { color:#dc3545; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Link Tidak Ditemukan</h1>
            <p>Short link yang Anda cari tidak ada atau sudah dihapus.</p>
            <a href="/" style="color:#6f42c1;">Kembali ke Beranda</a>
          </div>
        </body>
        </html>
      `);
    }

    let isSafe = true;
    let category = "safe";
    let confidence = 1.0;

    try {
  let urlToCheck = link.default_link;

  if (!/^https?:\/\//i.test(urlToCheck)) {
    urlToCheck = 'https://' + urlToCheck;
  }

  // ✅ LANGSUNG ML
  const metadata = await fetchMetadata(urlToCheck);

  const detectionResult = await classifyContent(
    metadata.title || "",
    link.description || metadata.description || "",
    metadata.bodyText || "",
    urlToCheck,
    metadata.keywords || ""
  );

  isSafe = detectionResult.isSafe;
  category = detectionResult.category || "unknown";
  confidence = detectionResult.confidence || 0;

} catch (err) {
  console.error("Error real-time check:", err.message);
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
            <p>Kemungkinan berisi penipuan, malware, atau konten berbahaya.</p>
            <p>Kami sarankan <strong>jangan melanjutkan</strong> untuk keamanan Anda.</p>
            <div class="buttons">
              <a href="${link.default_link}" class="btn btn-danger">Lanjutkan dengan Risiko Sendiri</a>
              <a href="javascript:history.back()" class="btn btn-safe">Kembali ke Aman</a>
            </div>
            <div class="footer">
              <p>Didukung oleh AI kami (Naive Bayes)</p>
              <p>Jika yakin ini kesalahan, laporkan ke admin.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    res.redirect(301, link.default_link);
  } catch (error) {
    console.error("Redirect error:", error.message);
    res.status(500).send("Server error");
  }
};

// ─────────────────────────────────────────────
// Fungsi lain tetap sama (tidak diubah)
// ─────────────────────────────────────────────

export const getAllLinks = async (req, res) => {
  try {
    const { userId } = req;
    const links = await Link.findAll({ where: { user_id: userId } });

    const formattedLinks = links.map((link) => ({
      id: link.id,
      shortUrl: `http://localhost:5000/${link.short_link}`,
      originalUrl: link.default_link,
      title: link.title || link.description || "Untitled",
      bodyText: link.body_text || "",
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

    const metadata = await fetchMetadata(fullUrl);

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
      keywords: metadata.keywords || "",
      body: metadata.bodyText || ""   
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
        keywords: "",
        body: "" 
      });
    } catch {
      return res.status(500).json({ error: "Gagal mengambil preview URL" });
    }
  }
};