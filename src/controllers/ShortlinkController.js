import Link from "../models/Link.js";
import User from "../models/User.js";
import { fetchMetadata } from "../utils/FetchMetadata.js";
import { classifyContent } from "../services/ContentClassifierService.js"; // ← PAKAI YANG BARU!

const normalizeShortCode = (code) => code.trim().toLowerCase();

export const shortenUrl = async (req, res) => {
  try {
    const { userId } = req;
    const { original_url, custom_short_link, description } = req.body;

    if (!original_url) {
      return res.status(400).json({ error: "original_url wajib diisi" });
    }

    // TAHAP 1: EKSTRAKSI METADATA
    const metadata = await fetchMetadata(original_url);

    if (metadata.title.includes("Error Fetching")) {
      return res.status(400).json({
        error: "Tidak dapat mengambil metadata dari URL. Pastikan URL valid dan dapat diakses.",
      });
    }

    const descriptionToDetect = description || metadata.description || "";

    // TAHAP 2: DETEKSI PAKAI NAIVE BAYES DARI PYTHON (FLASK)
    const detectionResult = await classifyContent(
      metadata.title,
      descriptionToDetect,
      metadata.bodyText || "",
      original_url
    );

    // BLOKIR KALAU TIDAK AMAN
    if (!detectionResult.isSafe) {
      console.warn(`[BLOCKED] ${detectionResult.category.toUpperCase()} | ${original_url}`);
      return res.status(403).json({
        error: `URL diblokir otomatis: terdeteksi sebagai ${detectionResult.category.toUpperCase()}`,
        category: detectionResult.category,
        confidence: (detectionResult.confidence * 100).toFixed(2) + "%",
        detail: "Sistem deteksi berbasis Naive Bayes (Python) mendeteksi konten berbahaya.",
      });
    }

    // BUAT SHORT CODE
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

    // SIMPAN KE DATABASE
    const newLink = await Link.create({
      default_link: original_url,
      short_link: shortCode,
      description: description || null,
      user_id: userId,
      title: metadata.title,
      scraped_description: metadata.description,
      content_category: detectionResult.category,
      content_probability: detectionResult.confidence || 1.0,
      is_malicious: !detectionResult.isSafe,
      classification_scores: JSON.stringify(detectionResult.scores || {}),
    });

    return res.status(201).json({
      message: "Shortlink berhasil dibuat & telah diverifikasi aman oleh Naive Bayes (Python)",
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

// FUNGSI LAIN TIDAK DIUBAH — TETAP SAMA
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
    if (!link) return res.status(404).send("Link not found");

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