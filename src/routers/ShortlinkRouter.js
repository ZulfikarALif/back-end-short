import { Router } from "express";
import {
  shortenUrl,
  redirectToOriginal,
  getAllLinks,
  // ✅ TAMBAHKAN INI: import fungsi getDashboardStats
  getDashboardStats,
} from "../controllers/ShortlinkController.js";

// ✅ Import fungsi deleteLink dari LinkController
import { deleteLink } from "../controllers/LinkController.js";

import { createShortlinkSchema } from "../validations/ShortlinkValidation.js";
import schemas from "../middlewares/Schema.js";
import verifyToken from "../middlewares/VerifyToken.js";

const router = Router();

// POST /shorten → buat shortlink (sudah ada)
router.post(
  "/shorten",
  verifyToken,
  schemas(createShortlinkSchema),
  shortenUrl
);

// GET /:short_code → redirect (sudah ada)
router.get("/:short_code", redirectToOriginal);

// GET /api/links → ambil semua link (sudah ada)
router.get("/api/links", verifyToken, getAllLinks);

// ✅ BARU: POST /api/links → buat link baru (untuk frontend)
router.post(
  "/api/links",
  verifyToken,
  schemas(createShortlinkSchema),
  shortenUrl
);

// ✅ BARU: DELETE /api/links/:id → hapus link
router.delete("/api/links/:id", verifyToken, deleteLink);

// ✅ BARU: GET /api/dashboard-stats → ambil statistik dashboard
router.get("/api/dashboard-stats", verifyToken, getDashboardStats);

export default router;