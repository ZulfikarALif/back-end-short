import { Router } from "express";
import {
  // updateUser,
  // deleteUser,
  login,
  register,
  getAllUsers,
  getDashboardStats,
} from "../controllers/UserController.js";
import schemas from "../middlewares/Schema.js";
import verifyToken from "../middlewares/VerifyToken.js";
// import {
//   userCreateSchema,
//   userUpdateSchema,
// } from "../validations/UserValidation.js";
// import { authenticateToken } from "../middlewares/auth.js"; // 🔸 Impor middleware auth

const router = Router();

router.get("/dashboard-stats", verifyToken, getDashboardStats);
router.get("/users", verifyToken, getAllUsers);
// router.post("/", schemas(userCreateSchema), createUser);
// router.put("/:id", schemas(userUpdateSchema), updateUser);
// router.delete("/:id", deleteUser);
router.post("/login", login);
router.post("/register", register);

export default router;
