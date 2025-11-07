// src/controllers/ShortlinkController.js
import Link from "../models/Link.js";

export const shortenUrl = async (req, res) => {
  try {
    const { userId } = req;

    const { original_url } = req.body;

    if (!original_url) {
      return res.status(400).json({ error: "original_url wajib diisi" });
    }

    // Gunakan short code sederhana: 6 karakter acak
    const shortCode = Math.random().toString(36).substring(2, 8);

    const newLink = await Link.create({
      default_link: original_url,
      short_link: shortCode,
      description: req.body.description || null,
      user_id: userId,
    });

    res.status(201).json({
      message: "Shortlink berhasil dibuat",
      short_url: `http://localhost:5000/${shortCode}`, // ⬅️ Paksa pakai localhost
      data: newLink,
    });
  } catch (error) {
    console.error("Error:", error.message || error);
    console.log(error);

    res.status(500).json({ error: "Gagal menyimpan ke database" });
  }
};

export const getAllLinks = async (req, res) => {
  try {
    const { userId } = req;
    const links = await Link.findAll({
      where: {
        user_id: userId,
      },
    });

    const formattedLinks = links.map((link) => ({
      id: link.id,
      shortUrl: `http://localhost:5000/${link.short_link}`, // ⬅️ Format sesuai frontend
      originalUrl: link.default_link,
      title: link.description || "Untitled",
      createdAt: link.createdAt
        ? new Date(link.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
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
    const link = await Link.findOne({ where: { short_link: short_code } });
    if (!link) return res.status(404).send("Not found");
    res.redirect(link.default_link);
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send("Server error");
  }
};
