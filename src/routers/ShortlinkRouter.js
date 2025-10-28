// src/routes/ShortlinkRouter.js
import { Router } from "express";
import {
  shortenUrl,
  redirectToOriginal,
  getAllLinks,
} from "../controllers/ShortlinkController.js";

import { createShortlinkSchema } from "../validations/ShortlinkValidation.js";
import schemas from "../middlewares/Schema.js";

const router = Router();

// POST /shorten → buat shortlink (sudah ada)
router.post("/shorten", schemas(createShortlinkSchema), shortenUrl);

// GET /:short_code → redirect (sudah ada)
router.get("/:short_code", redirectToOriginal);

// GET /api/links → ambil semua link (sudah ada)
router.get("/api/links", getAllLinks);

// ✅ BARU: POST /api/links → buat link baru (untuk frontend)
router.post("/api/links", schemas(createShortlinkSchema), shortenUrl); // <-- Ini yang kamu butuhkan!

export default router;