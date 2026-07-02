import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db.js";
import { signAccess, signRefresh } from "../auth/jwt.js";

export const authRouter = Router();

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = LoginBody.parse(req.body);
    const [rows]: any = await pool.query(
      `SELECT u.id, u.password_hash, u.full_name, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.email = :email AND u.deleted_at IS NULL AND u.is_active = 1`,
      { email },
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = :id", { id: u.id });
    res.json({
      accessToken: signAccess({ id: u.id, role: u.role }),
      refreshToken: signRefresh({ id: u.id }),
      user: { id: u.id, name: u.full_name, role: u.role },
    });
  } catch (e) { next(e); }
});
