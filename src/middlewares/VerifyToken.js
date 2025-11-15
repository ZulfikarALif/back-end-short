import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("❌ No token provided");
    return res.sendStatus(401);
  }

  // ✅ DIPERBAIKI: gunakan JWT_SECRET, bukan ACCESS_TOKEN
  console.log(
    "🔐 Verifying token with JWT_SECRET length:",
    process.env.JWT_SECRET?.length || 0
  );

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("🔴 JWT verify failed:", err.message);
      return res.sendStatus(403);
    }

    console.log("🟢 Decoded user ID:", decoded.id);
    req.userId = decoded.id;
    next();
  });
};

export default verifyToken;
