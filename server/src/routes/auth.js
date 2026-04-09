import { Router } from "express";
import { createAuthToken } from "../lib/authToken.js";
import { requireAuth } from "../middleware/auth.js";
import { createUser, findUserByEmail, findUserById, toPublicUser, verifyUserPassword } from "../data/users.js";

const authRouter = Router();

authRouter.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();

    const user = await findUserByEmail(email);
    const valid = await verifyUserPassword(user, password);
    if (!valid) {
      res.status(401).json({ message: "Email veya sifre hatali." });
      return;
    }

    const token = createAuthToken({
      userId: user.id,
      role: user.role,
      email: user.email
    });

    res.json({
      token,
      user: toPublicUser(user)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

authRouter.post("/auth/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();
    const displayName = String(req.body?.displayName || "").trim();

    const user = await createUser({ email, password, displayName });
    const token = createAuthToken({
      userId: user.id,
      role: user.role,
      email: user.email
    });

    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.auth.userId);
    if (!user) {
      res.status(401).json({ message: "Kullanici bulunamadi." });
      return;
    }

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export { authRouter };