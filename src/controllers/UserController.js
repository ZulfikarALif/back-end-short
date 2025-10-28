import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const createUser = async (req, res) => {
  const { email, full_name, password, role } = req.body;

  try {
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);

    await User.create({
      email: email,
      full_name: full_name,
      password: hashPassword,
      role: role,
    });

    return res.status(201).json({ message: "create acces" });
  } catch (error) {
    return res.status(500).json({ error });
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
    await user.destroy()

    return res.status(200).json({ message: "delete berhasil" });
  } catch (error) {
    return res.status(500).json({ error });
  }
};
