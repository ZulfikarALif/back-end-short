import Link from "../models/Link.js";

// Helper: normalisasi short code ke lowercase
const normalizeShortCode = (code) => code.trim().toLowerCase();

export const shortenUrl = async (req, res) => {
  try {
    const { userId } = req;
    const { original_url, custom_short_link, description } = req.body;

    if (!original_url) {
      return res.status(400).json({ error: "original_url wajib diisi" });
    }

    let shortCode;

    if (custom_short_link) {
      const raw = custom_short_link.trim();
      if (!raw) {
        return res
          .status(400)
          .json({ error: "Custom short link tidak boleh kosong" });
      }

      // ✅ Izinkan huruf besar/kecil + angka, panjang 3–6
      if (raw.length < 3 || raw.length > 6) {
        return res
          .status(400)
          .json({ error: "Custom short link harus 3–6 karakter" });
      }

      if (!/^[a-zA-Z0-9]+$/.test(raw)) {
        return res
          .status(400)
          .json({ error: "Hanya boleh huruf (A–Z, a–z) dan angka (0–9)" });
      }

      // Normalisasi ke lowercase untuk penyimpanan & pengecekan unik
      const normalized = normalizeShortCode(raw);

      // Cek keunikan berdasarkan lowercase
      const existing = await Link.findOne({
        where: { short_link: normalized },
      });
      if (existing) {
        return res
          .status(409)
          .json({ error: "Short link tersebut sudah digunakan" });
      }

      shortCode = normalized; // simpan lowercase
    } else {
      // Acak: tetap 6 karakter lowercase (sesuai aslinya)
      shortCode = Math.random().toString(36).substring(2, 8);
    }

    const newLink = await Link.create({
      default_link: original_url,
      short_link: shortCode, // lowercase
      description: description || null,
      user_id: userId,
    });

    res.status(201).json({
      message: "Shortlink berhasil dibuat",
      short_url: `http://localhost:5000/${shortCode}`,
      newLink,
    });
  } catch (error) {
    console.error("Error in shortenUrl:", error);
    res.status(500).json({ error: "Gagal menyimpan ke database" });
  }
};

// TIDAK DIUBAH
export const getAllLinks = async (req, res) => {
  try {
    const { userId } = req;
    const links = await Link.findAll({ where: { user_id: userId } });

    const formattedLinks = links.map((link) => ({
      id: link.id,
      shortUrl: `http://localhost:5000/${link.short_link}`,
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

// 🔁 DIMODIFIKASI: cari pakai LOWERCASE agar case-insensitive saat redirect
export const redirectToOriginal = async (req, res) => {
  try {
    const { short_code } = req.params;
    if (!short_code) return res.status(400).send("Short code required");

    // Normalisasi input ke lowercase
    const normalized = normalizeShortCode(short_code);

    const link = await Link.findOne({ where: { short_link: normalized } });
    if (!link) return res.status(404).send("Link not found");

    res.redirect(301, link.default_link); // 301 = permanent redirect
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send("Server error");
  }
};

// Tambahkan fungsi ini di akhir file (setelah redirectToOriginal)
export const deleteLink = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Link ID diperlukan" });
    }

    // Cari link by ID + pastikan milik user ini
    const link = await Link.findOne({
      where: { id, user_id: userId },
    });

    if (!link) {
      return res.status(404).json({
        error: "Link tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    await link.destroy(); // hapus dari DB

    return res.status(200).json({
      message: "Link berhasil dihapus",
      id: link.id,
      short_link: link.short_link,
    });
  } catch (error) {
    console.error("Error in deleteLink:", error);
    return res.status(500).json({ error: "Gagal menghapus link" });
  }
};
