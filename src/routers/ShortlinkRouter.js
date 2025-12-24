import { Router } from "express";
import {
  shortenUrl,
  redirectToOriginal,
  getAllLinks,
  getDashboardStats,
} from "../controllers/ShortlinkController.js";

import { deleteLink } from "../controllers/LinkController.js";

import { createShortlinkSchema } from "../validations/ShortlinkValidation.js";
import schemas from "../middlewares/Schema.js";
import verifyToken from "../middlewares/VerifyToken.js";
import { getUrlPreview } from "../controllers/ShortlinkController.js";

// ✅ TAMBAHKAN IMPORT INI
import { checkSafeBrowsing } from "../utils/GoogleSafeBrowsing.js";

const router = Router();

// POST /shorten → buat shortlink (lama)
router.post(
  "/shorten",
  verifyToken,
  schemas(createShortlinkSchema),
  shortenUrl
);

// GET /:short_code → redirect (lama)
router.get("/:short_code", redirectToOriginal);

// GET /api/links → ambil semua link (lama)
router.get("/api/links", verifyToken, getAllLinks);

// POST /api/links → buat link baru (untuk frontend)
router.post(
  "/api/links",
  verifyToken,
  schemas(createShortlinkSchema),
  shortenUrl
);

// DELETE /api/links/:id → hapus link
router.delete("/api/links/:id", verifyToken, deleteLink);
router.get("/api/preview", getUrlPreview);

// GET /api/dashboard-stats → statistik dashboard
router.get("/api/dashboard-stats", verifyToken, getDashboardStats);

// ✅ BARU: Route test sementara untuk cek Google Safe Browsing (bisa dihapus nanti setelah yakin jalan)
router.get("/test-safebrowsing", async (req, res) => {
  try {
    const malwareUrl = "http://testsafebrowsing.google.com/s/malware.html";
    const safeUrl = "https://google.com";

    const [malwareResult, safeResult] = await Promise.all([
      checkSafeBrowsing(malwareUrl),
      checkSafeBrowsing(safeUrl),
    ]);

    res.json({
      message: "Test Google Safe Browsing",
      malware_test: { url: malwareUrl, result: malwareResult },
      safe_test: { url: safeUrl, result: safeResult },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;