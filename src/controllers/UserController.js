// controllers/UserController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Op, Sequelize } from "sequelize";
import Link from "../models/Link.js";
import multer from "multer"; // Import multer
import path from "path"; // Import path
// --- TAMBAHKAN INI ---
import nodemailer from "nodemailer";
import crypto from "crypto";

dotenv.config();

// --- KONFIGURASI MULTER UNTUK UPLOAD AVATAR ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Pastikan folder 'uploads' ada di root project Anda
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Buat nama file unik untuk menghindari konflik
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// ✅ Ekspor upload agar bisa digunakan di router
export const upload = multer({
  storage: storage,
  // Batasi ukuran file (opsional)
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  // Filter file (hanya gambar)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// --- FUNGSI HELPER UNTUK MENGIRIM EMAIL ---
const sendResetEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // Ganti jika menggunakan layanan lain
    auth: {
      user: process.env.EMAIL_USER, // Harus diatur di .env
      pass: process.env.EMAIL_PASS, // Gunakan App Password untuk Gmail
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`; // Ganti dengan URL frontend Anda

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Password Anda",
    html: `
      <h2>Halo,</h2>
      <p>Anda meminta reset password. Klik link di bawah ini untuk mereset password Anda:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>Link ini akan kadaluarsa dalam 1 jam.</p>
      <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// --- FUNGSI UNTUK FORGOT PASSWORD ---
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Cari user berdasarkan email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Untuk alasan keamanan, jangan beri tahu apakah email ada atau tidak
      return res
        .status(200)
        .json({
          message:
            "Jika email Anda terdaftar, kami akan mengirimkan link reset password.",
        });
    }

    // Generate token dan set expiry (1 jam)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 3600000; // 1 jam dalam milidetik

    // Simpan token dan expiry ke database
    await user.update({
      resetToken: resetToken,
      resetTokenExpires: resetTokenExpires,
    });

    // Kirim email
    await sendResetEmail(email, resetToken);

    res
      .status(200)
      .json({ message: "Link reset password telah dikirim ke email Anda." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat memproses permintaan." });
  }
};

// --- FUNGSI UNTUK RESET PASSWORD ---
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Cari user berdasarkan token dan cek apakah token masih valid
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpires: { [Op.gt]: Date.now() }, // Token belum kadaluarsa
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token tidak valid atau telah kadaluarsa." });
    }

    // Hash password baru
    const salt = await bcrypt.genSalt();
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password dan hapus token
    await user.update({
      password: hashedNewPassword,
      resetToken: null,
      resetTokenExpires: null,
    });

    res
      .status(200)
      .json({
        message:
          "Password berhasil diubah. Silakan login dengan password baru Anda.",
      });
  } catch (error) {
    console.error("Reset password error:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mereset password." });
  }
};

// Fungsi untuk upload avatar
export const uploadAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    // Verifikasi bahwa user yang login adalah user yang avatar-nya diupload
    // Middleware VerifyToken harus dijalankan dulu untuk menetapkan req.user.id
    if (req.userId !== id) {
      return res
        .status(403)
        .json({
          message: "Access denied. Cannot update another user's avatar.",
        });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Simpan path relatif ke database
    const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    await user.update({ avatar_url: avatarUrl });

    // Kembalikan respons dengan avatar_url baru
    return res.status(200).json({
      message: "Avatar uploaded successfully",
      avatar_url: avatarUrl,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return res
      .status(500)
      .json({
        message: "Server error saat upload avatar",
        error: error.message,
      });
  }
};

// controllers/UserController.js
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, page_size = 10, search } = req.query;
    const current = Number(page);
    const limit = Number(page_size);
    const offset = (current - 1) * limit;
    const where = {
      ...(search && { full_name: { [Op.like]: `%${search}%` } }),
      role: {
        [Op.not]: "admin",
      },
    };
    const { count, rows } = await User.findAndCountAll({
      attributes: {
        include: [
          [
            // Subquery yang menghitung total link per user
            Sequelize.literal(`(
          SELECT COUNT(*)
          FROM links AS l
          WHERE l.user_id = users.id
        )`),
            "total_links",
          ],
        ],
      },
      include: [
        {
          model: Link,
          as: "links",
          attributes: [],
          required: false,
        },
      ],
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    // karena count berupa array, hitung manual total user
    const total = Array.isArray(count) ? count.length : count;

    // bentuk ulang output biar rapi
    const users = rows.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      createdAt: user.createdAt,
      total_links: user.get("total_links"),
    }));

    return res.status(200).json({ users, total });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Gagal mengambil daftar pengguna" });
  }
};

export const updateUser = async (req, res) => {
  const { email, full_name, role } = req.body;
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "not found" });
    await user.update({
      email: email,
      full_name: full_name,
      role: role,
    });

    return res.status(200).json({ message: "update selesai" });
  } catch (error) {
    return res.status(500).json({ error });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "not found" });
    await user.destroy();

    return res.status(200).json({ message: "delete berhasil" });
  } catch (error) {
    return res.status(500).json({ error });
  }
};

// 🔑 FUNGSI LOGIN — DIPERBAIKI: tambahkan avatar_url
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    // ✅ DIPERBAIKI: gunakan JWT_SECRET
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      process.env.JWT_SECRET, // ← diubah ke JWT_SECRET
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        // Tambahkan avatar_url ke respons
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error saat login" });
  }
};

// ✅ FUNGSI REGISTER — DIPERBAIKI: tambahkan avatar_url
export const register = async (req, res) => {
  const { full_name, email, password, role } = req.body;
  try {
    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);

    // Buat user baru
    const newUser = await User.create({
      full_name,
      email,
      password: hashPassword,
      role: "user",
      // Tambahkan avatar_url default (opsional)
      avatar_url: null, // Atau URL default jika ingin
    });

    // ✅ DIPERBAIKI: gunakan JWT_SECRET saja (tanpa fallback)
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
      },
      process.env.JWT_SECRET, // ← pastikan dari .env
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Registrasi berhasil",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        // Tambahkan avatar_url ke respons
        avatar_url: newUser.avatar_url,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error saat registrasi" });
  }
};

// --- FUNGSI DASHBOARD — TETAP UTUH ---
export const getDashboardStats = async (req, res) => {
  try {
    // Hitung jumlah pengguna non-admin (sesuai logika getAllUsers Anda)
    const totalUsers = await User.count({
      where: {
        role: { [Op.not]: "admin" },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalLinks: 0, // placeholder — isi nanti kalau sudah ada Link model aktif
        activeDomains: 0, // placeholder
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik dashboard",
    });
  }
};
