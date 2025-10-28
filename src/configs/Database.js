import { Sequelize } from "sequelize";
import "dotenv/config";

const db = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
  dialect: "mysql",
  timezone: "+08:00",
});
export default db;
