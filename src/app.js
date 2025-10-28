import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import db from "./configs/Database.js";
import ShortlinkRouter from "./routers/ShortlinkRouter.js";
// import createModel from "./models/Link.js";

import RouteUser from "./routers/UserRouter.js";

const app = express();
const port = process.env.PORT || 5000;

try {
  await db.authenticate();
  console.log("databaseconnect");
  //   await createModel.sync();
} catch (error) {
  console.log(error);
}

app.use(express.json());
app.use(cors({ credentials: true, origin: "http://localhost:8080" }));
app.use(cookieParser());

app.use("/users", RouteUser);
app.use("/", ShortlinkRouter);

app.listen(port, () => {
  console.log(`server running port ${port}`);
});
