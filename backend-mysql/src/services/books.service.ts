import { BooksRepo } from "../repositories/books.repo.js";
import { pool } from "../db.js";

export const BooksService = {
  list: BooksRepo.list,

  async create(data: any) {
    if (data.isbn) {
      const dup = await BooksRepo.findByIsbn(data.isbn);
      if (dup) throw Object.assign(new Error("Duplicate ISBN"), { status: 409 });
    }
    return BooksRepo.insert(data);
  },

  /** Import many rows in a single transaction, skipping duplicates. */
  async bulkImport(rows: any[]) {
    const conn = await pool.getConnection();
    const summary = { inserted: 0, skipped: 0, errors: [] as { row: number; reason: string }[] };
    try {
      await conn.beginTransaction();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          if (!r.title) throw new Error("Title required");
          if (r.isbn) {
            const [dup]: any = await conn.query(
              "SELECT id FROM books WHERE isbn=? AND deleted_at IS NULL LIMIT 1", [r.isbn]);
            if (dup.length) { summary.skipped++; summary.errors.push({ row: i + 2, reason: "Duplicate ISBN" }); continue; }
          }
          await conn.query(
            `INSERT INTO books (isbn, title, edition, no_of_pages, no_of_copies, available_copies, price, mrp)
             VALUES (?,?,?,?,?,?,?,?)`,
            [r.isbn ?? null, r.title, r.edition ?? null, r.pages ?? null, r.copies ?? 1, r.copies ?? 1, r.price ?? null, r.mrp ?? null],
          );
          summary.inserted++;
        } catch (e: any) {
          summary.errors.push({ row: i + 2, reason: e.message });
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    return summary;
  },
};
