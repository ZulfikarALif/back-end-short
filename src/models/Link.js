// src/models/Link.js
import { DataTypes } from "sequelize";
import db from "../configs/Database.js";
import User from "./User.js";

const Link = db.define(
  "links",
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
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

Link.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "cascade",
});
User.hasMany(Link, {
  foreignKey: "user_id",
  as: "links",
});

export default Link;
