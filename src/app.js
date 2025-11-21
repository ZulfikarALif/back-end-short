// src/app.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import db from "./configs/Database.js";
import ShortlinkRouter from "./routers/ShortlinkRouter.js";
import userRouter from "./routers/UserRouter.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

try {
  await db.authenticate();
  console.log("Database connected");

  // --- TAMBAHKAN INI ---
  await db.sync({ alter: true }); // Sinkronkan model dengan database
  console.log("Database synchronized");
  // ------------------------
} catch (error) {
  console.log("Database connection or sync error:", error);
}

app.use(
  cors({
    origin: ["http://localhost:8080", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api", userRouter);
app.use("/", ShortlinkRouter);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});