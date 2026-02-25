import { Sequelize } from "sequelize";
import "dotenv/config";

const db = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    timezone: "+08:00",
    // Matikan log SQL di terminal jika sudah terlalu ramai
    logging: false, 
    define: {
      // Mencegah Sequelize mengubah nama tabel menjadi jamak (plural)
      freezeTableName: true 
    }
  }
);

export default db;