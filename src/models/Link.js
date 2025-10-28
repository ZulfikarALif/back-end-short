// src/models/Link.js
import { DataTypes } from "sequelize";
import db from "../configs/Database.js";

const Link = db.define(
  "links",
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    default_link: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    short_link: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "links",
    timestamps: false, // Nonaktifkan createdAt/updatedAt
    freezeTableName: true,
  }
);

export default Link;