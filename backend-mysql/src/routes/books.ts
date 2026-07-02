import { Router } from "express";
import { BooksService } from "../services/books.service.js";
import { requireAuth, requireRole } from "../auth/jwt.js";

export const booksRouter = Router();
booksRouter.use(requireAuth);

booksRouter.get("/", async (req, res, next) => {
  try {
    const { q, limit, offset } = req.query;
    res.json(await BooksService.list({
      q: q as string | undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    }));
  } catch (e) { next(e); }
});

booksRouter.post("/", requireRole("admin", "librarian"), async (req, res, next) => {
  try { res.status(201).json({ id: await BooksService.create(req.body) }); }
  catch (e) { next(e); }
});

booksRouter.post("/bulk-import", requireRole("admin", "librarian"), async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    res.json(await BooksService.bulkImport(rows));
  } catch (e) { next(e); }
});
