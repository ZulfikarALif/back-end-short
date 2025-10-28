import { Router } from "express";
import {
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/UserController.js";
import schemas from "../middlewares/Schema.js";
import {
  userCreateSchema,
  userUpdateSchema,
} from "../validations/UserValidation.js";

const router = Router();

router.post("/", schemas(userCreateSchema), createUser);
router.put("/:id", schemas(userUpdateSchema), updateUser);
router.delete("/:id", deleteUser);

export default router;
