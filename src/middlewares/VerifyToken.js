// src/middlewares/VerifyToken.js
import jwt from "jsonwebtoken";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // ✅ Gunakan async/await agar error lebih jelas
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🟢 Decoded user ID:", decoded.id);

    if (!decoded.id) {
      console.warn("⚠️ Token does not contain 'id'");
      return res.status(401).json({ error: "Invalid token payload" });
    }

    req.userId = decoded.id; // ✅ string UUID
    next();
  } catch (err) {
    console.error("🔴 JWT verification failed:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export default verifyToken;
