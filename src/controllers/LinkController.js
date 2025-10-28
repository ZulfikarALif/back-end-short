// src/controllers/LinkController.js
import Link from "../models/Link.js";

// ✅ Baru: Ambil semua link (untuk halaman "My Links")
export const getAllLinks = async (req, res) => {
  try {
    const links = await Link.findAll({
      order: [["createdAt", "DESC"]], // Urutkan dari terbaru
    });

    // Format data agar sesuai dengan frontend (React)
    const formattedLinks = links.map((link) => ({
      id: link.id,
      shortUrl: `https://quickclick.hub/${link.short_link}`, // Sesuaikan domain jika perlu
      originalUrl: link.default_link,
      title: link.description || "Untitled",
      createdAt: link.createdAt ? new Date(link.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) : "Unknown",
      clicks: 0, // Jika kamu belum track klik, set default 0 dulu
    }));

    return res.status(200).json(formattedLinks);
  } catch (error) {
    console.error("Error fetching links:", error);
    return res.status(500).json({ error: "Gagal mengambil daftar link" });
  }
};

// Buat link baru
export const createLink = async (req, res) => {
  const { default_link, short_link, description } = req.body;

  try {
    await Link.create({
      default_link,
      short_link,
      description,
    });

    return res.status(201).json({ message: "Link berhasil dibuat" });
  } catch (error) {
    console.error("Create link error:", error);
    return res.status(500).json({ error: "Gagal membuat link" });
  }
};

// Update link
export const updateLink = async (req, res) => {
  const { default_link, short_link, description } = req.body;
  const { id } = req.params;

  try {
    const link = await Link.findByPk(id);
    if (!link) return res.status(404).json({ message: "Link tidak ditemukan" });

    await link.update({
      default_link,
      short_link,
      description,
    });

    return res.status(200).json({ message: "Link berhasil diperbarui" });
  } catch (error) {
    console.error("Update link error:", error);
    return res.status(500).json({ error: "Gagal memperbarui link" });
  }
};

// Hapus link
export const deleteLink = async (req, res) => {
  const { id } = req.params;

  try {
    const link = await Link.findByPk(id);
    if (!link) return res.status(404).json({ message: "Link tidak ditemukan" });

    await link.destroy();
    return res.status(200).json({ message: "Link berhasil dihapus" });
  } catch (error) {
    console.error("Delete link error:", error);
    return res.status(500).json({ error: "Gagal menghapus link" });
  }
};