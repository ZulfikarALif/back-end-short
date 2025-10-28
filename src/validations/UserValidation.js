import { check, z } from "zod";
import User from "../models/User.js";
import { Op } from "sequelize";

export const userCreateSchema = z
  .object({
    email: z.string().email().nonempty("email tidak boleh kosong"),
    full_name: z.string().nonempty("alip"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/\d/, "Password must contain at least one number")
      .regex(
        /[^a-zA-Z\d]/,
        "Password must contain at least one special character"
      ),
  })
  .superRefine(async (data, ctx) => {
    const cekEmail = await User.findOne({
      where: { email: data.email },
    });
    if (cekEmail) {
      ctx.addIssue({
        path: ["email"],
        code: "custom",
        message: "email telah terdaftar",
      });
    }
  });
export const userUpdateSchema = z
  .object({
    email: z.string().email().nonempty("email tidak boleh kosong"),
    full_name: z.string().nonempty("alip"),
    id: z.uuidv4(),
  })
  .superRefine(async (data, ctx) => {
    const cekEmail = await User.findOne({
      where: { email: data.email, id: { [Op.not]: data.id } },
    });
    if (cekEmail) {
      ctx.addIssue({
        path: ["email"],
        code: "custom",
        message: "email telah terdaftar",
      });
    }
  });
