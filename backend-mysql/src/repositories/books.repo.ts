// Repository — raw SQL for books
import { pool } from "../db.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export const BooksRepo = {
  async list({ q, limit = 50, offset = 0 }: { q?: string; limit?: number; offset?: number }) {
    const where = q ? "WHERE (b.title LIKE :q OR b.isbn LIKE :q)" : "";
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT b.*, a.name AS author, c.name AS category, p.name AS publisher, l.name AS language
       FROM books b
       LEFT JOIN authors a ON a.id = b.author_id
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN publishers p ON p.id = b.publisher_id
       LEFT JOIN languages l ON l.id = b.language_id
       ${where} AND b.deleted_at IS NULL
       ORDER BY b.id DESC LIMIT :limit OFFSET :offset`.replace("WHERE  AND", "WHERE").replace(" AND b.deleted_at IS NULL", where ? " AND b.deleted_at IS NULL" : "WHERE b.deleted_at IS NULL"),
      { q: `%${q ?? ""}%`, limit, offset },
    );
    return rows;
  },
  async findByIsbn(isbn: string) {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM books WHERE isbn = :isbn AND deleted_at IS NULL LIMIT 1", { isbn });
    return rows[0];
  },
  async insert(data: any) {
    const [r] = await pool.query<ResultSetHeader>(
      `INSERT INTO books (isbn, title, book_type_id, category_id, author_id, publisher_id,
        language_id, edition, publishing_year, no_of_pages, no_of_copies, available_copies, price, mrp)
       VALUES (:isbn, :title, :book_type_id, :category_id, :author_id, :publisher_id,
        :language_id, :edition, :publishing_year, :no_of_pages, :no_of_copies, :no_of_copies, :price, :mrp)`,
      data,
    );
    return r.insertId;
  },
  async softDelete(id: number) {
    await pool.query("UPDATE books SET deleted_at = NOW() WHERE id = :id", { id });
  },
};
