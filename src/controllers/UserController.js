import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Op, Sequelize } from "sequelize";
import Link from "../models/Link.js";
dotenv.config();

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

// 🔑 FUNGSI LOGIN BARU — ditambahkan sesuai permintaan
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

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      process.env.ACCESS_TOKEN,
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
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error saat login" });
  }
};

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
    });

    // Generate JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
      },
      process.env.JWT_SECRET || "quickclick_secret_key",
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
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error saat registrasi" });
  }
};
