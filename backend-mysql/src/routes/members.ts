import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth/jwt.js";

export const membersRouter = Router();
membersRouter.use(requireAuth);

membersRouter.get("/", async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM members WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 500");
    res.json(rows);
  } catch (e) { next(e); }
});

membersRouter.post("/", requireRole("admin", "librarian"), async (req, res, next) => {
  try {
    const { member_code, name, email, phone, address, pin_code, member_type, class_grade } = req.body;
    const [r]: any = await pool.query(
      `INSERT INTO members (member_code, name, email, phone, address, pin_code, member_type, class_grade)
       VALUES (?,?,?,?,?,?,?,?)`,
      [member_code, name, email ?? null, phone ?? null, address ?? null, pin_code ?? null, member_type ?? "student", class_grade ?? null],
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});
