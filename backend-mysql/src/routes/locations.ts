import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth/jwt.js";

export const locationsRouter = Router();
locationsRouter.use(requireAuth);

const LEVELS: Record<string, { table: string; parent?: string }> = {
  campuses:  { table: "campuses" },
  buildings: { table: "buildings", parent: "campus_id" },
  floors:    { table: "floors",    parent: "building_id" },
  rooms:     { table: "rooms",     parent: "floor_id" },
  almirahs:  { table: "almirahs",  parent: "room_id" },
  racks:     { table: "racks",     parent: "almirah_id" },
  shelves:   { table: "shelves",   parent: "rack_id" },
};

// List with optional parent filter
locationsRouter.get("/:level", async (req, res, next) => {
  try {
    const cfg = LEVELS[req.params.level];
    if (!cfg) return res.status(404).json({ error: "Unknown level" });
    const parentId = req.query.parentId as string | undefined;
    const where = cfg.parent && parentId ? `WHERE ${cfg.parent} = ? AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    const params = cfg.parent && parentId ? [parentId] : [];
    const [rows] = await pool.query(`SELECT * FROM ${cfg.table} ${where} ORDER BY name`, params);
    res.json(rows);
  } catch (e) { next(e); }
});

locationsRouter.post("/:level", requireRole("admin", "librarian"), async (req, res, next) => {
  try {
    const cfg = LEVELS[req.params.level];
    if (!cfg) return res.status(404).json({ error: "Unknown level" });
    const { name, code, parentId, capacity, position, level_no } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const cols = ["name"], vals: any[] = [name], q = ["?"];
    if (code !== undefined) { cols.push("code"); vals.push(code); q.push("?"); }
    if (capacity !== undefined && cfg.table === "racks") { cols.push("capacity"); vals.push(capacity); q.push("?"); }
    if (position !== undefined && cfg.table === "shelves") { cols.push("position"); vals.push(position); q.push("?"); }
    if (level_no !== undefined && cfg.table === "floors") { cols.push("level_no"); vals.push(level_no); q.push("?"); }
    if (cfg.parent) { cols.push(cfg.parent); vals.push(parentId); q.push("?"); }
    const [r]: any = await pool.query(`INSERT INTO ${cfg.table} (${cols.join(",")}) VALUES (${q.join(",")})`, vals);
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

locationsRouter.delete("/:level/:id", requireRole("admin", "librarian"), async (req, res, next) => {
  try {
    const cfg = LEVELS[req.params.level];
    if (!cfg) return res.status(404).json({ error: "Unknown level" });
    await pool.query(`UPDATE ${cfg.table} SET deleted_at = NOW() WHERE id = ?`, [req.params.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

// Rack inventory (capacity vs current)
locationsRouter.get("/racks/:id/inventory", async (req, res, next) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM rack_inventory WHERE rack_id = ?", [req.params.id]);
    res.json(rows[0] ?? null);
  } catch (e) { next(e); }
});

// Book transfer between racks
locationsRouter.post("/transfer", requireRole("admin", "librarian"), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { book_id, to_rack_id, to_shelf_id, position, remarks } = req.body;
    await conn.beginTransaction();
    const [[loc]]: any = await conn.query(
      "SELECT * FROM book_locations WHERE book_id = ? FOR UPDATE", [book_id]);
    await conn.query(
      `INSERT INTO book_locations (book_id, rack_id, shelf_id, position)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE rack_id=VALUES(rack_id), shelf_id=VALUES(shelf_id), position=VALUES(position)`,
      [book_id, to_rack_id, to_shelf_id ?? null, position ?? null],
    );
    await conn.query(
      `INSERT INTO book_transfers (book_id, from_rack_id, to_rack_id, from_snapshot, to_snapshot, remarks)
       VALUES (?,?,?,?,?,?)`,
      [book_id, loc?.rack_id ?? null, to_rack_id,
       JSON.stringify(loc ?? null),
       JSON.stringify({ rack_id: to_rack_id, shelf_id: to_shelf_id, position }),
       remarks ?? null],
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});
