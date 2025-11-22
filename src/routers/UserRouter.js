// routers/UserRouter.js
import { Router } from "express";

import {
  login,
  register,
  getAllUsers,
  getDashboardStats,
  uploadAvatar,
  upload,
  forgotPassword,
  resetPassword,
  updatePassword
} from "../controllers/UserController.js";
import schemas from "../middlewares/Schema.js";
import verifyToken from "../middlewares/VerifyToken.js";

const router = Router();

// Gunakan middleware verifyToken untuk endpoint yang memerlukan autentikasi
router.get("/dashboard-stats", verifyToken, getDashboardStats);
router.get("/users", verifyToken, getAllUsers);

// Route untuk login dan register
router.post("/login", login);
router.post("/register", register);

// --- TAMBAHKAN ROUTE INI ---
// Route untuk forgot password - TIDAK PERLU autentikasi
router.post("/forgot-password", forgotPassword);

// Route untuk reset password - TIDAK PERLU autentikasi (token dari email)
router.put("/reset-password/:token", resetPassword);
// --------------------------

// Route untuk upload avatar - PERLU autentikasi
// Gunakan middleware verifyToken dan multer untuk upload file
router.put(
  "/upload-avatar/:id",
  verifyToken,
  upload.single("avatar"),
  uploadAvatar
); // Tambahkan route ini
 // Route untuk update password - PERLU autentikasi
router.patch("/password", verifyToken, updatePassword);

export default router;