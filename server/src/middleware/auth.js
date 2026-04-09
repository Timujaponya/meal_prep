import { verifyAuthToken } from "../lib/authToken.js";

export function requireAuth(req, res, next) {
  const rawHeader = req.headers.authorization || "";
  const [, token] = rawHeader.split(" ");

  if (!token) {
    res.status(401).json({ message: "Yetkisiz istek. Lutfen giris yapin." });
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email
    };
    next();
  } catch (error) {
    res.status(401).json({ message: error.message || "Oturum gecersiz." });
  }
}

export function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles);

  return (req, res, next) => {
    if (!req.auth?.role || !allowed.has(req.auth.role)) {
      res.status(403).json({ message: "Bu islem icin yetkiniz yok." });
      return;
    }

    next();
  };
}