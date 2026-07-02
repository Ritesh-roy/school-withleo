import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth/jwt.js";

export const issuesRouter = Router();
issuesRouter.use(requireAuth);

// Issue a book
issuesRouter.post("/", requireRole("admin", "librarian"), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { book_id, member_id, due_at, remarks } = req.body;
    await conn.beginTransaction();
    const [[book]]: any = await conn.query(
      "SELECT id, available_copies FROM books WHERE id = ? AND deleted_at IS NULL FOR UPDATE", [book_id]);
    if (!book) throw Object.assign(new Error("Book not found"), { status: 404 });
    if (book.available_copies <= 0) throw Object.assign(new Error("No copies available"), { status: 409 });
    await conn.query(
      `INSERT INTO book_issues (book_id, member_id, due_at, remarks) VALUES (?,?,?,?)`,
      [book_id, member_id, due_at, remarks ?? null]);
    await conn.query("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?", [book_id]);
    await conn.commit();
    res.status(201).json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

// Return a book, compute fine
issuesRouter.post("/:id/return", requireRole("admin", "librarian"), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[iss]]: any = await conn.query(
      "SELECT * FROM book_issues WHERE id = ? FOR UPDATE", [req.params.id]);
    if (!iss) throw Object.assign(new Error("Issue not found"), { status: 404 });
    if (iss.returned_at) throw Object.assign(new Error("Already returned"), { status: 409 });

    const [[fineRow]]: any = await conn.query(
      "SELECT value FROM settings WHERE key_name = 'fine_per_day'");
    const finePerDay = Number(fineRow?.value ?? 0);
    const now = new Date();
    const overdueDays = Math.max(0, Math.ceil((now.getTime() - new Date(iss.due_at).getTime()) / 86400000));
    const fine = overdueDays * finePerDay;

    await conn.query(
      "UPDATE book_issues SET returned_at = NOW(), fine_amount = ? WHERE id = ?",
      [fine, iss.id]);
    await conn.query("UPDATE books SET available_copies = available_copies + 1 WHERE id = ?", [iss.book_id]);
    await conn.commit();
    res.json({ ok: true, fine });
  } catch (e) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});
