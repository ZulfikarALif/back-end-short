import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import db from "./configs/Database.js";
import ShortlinkRouter from "./routers/ShortlinkRouter.js";
import userRouter from "./routers/UserRouter.js";
import dotenv from "dotenv";
// import createModel from "./models/Link.js";
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

try {
  await db.authenticate();
  // await createModel.sync({ alter: true });
  console.log("Database connected");
} catch (error) {
  console.log("Database connection error:", error);
}

// ✅ CORS fleksibel untuk development
app.use(
  cors({
    origin: true, // ← ini yang penting!
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Route
app.use("/api", userRouter);
app.use("/", ShortlinkRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
