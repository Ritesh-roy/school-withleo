import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { pool } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { booksRouter } from "./routes/books.js";
import { membersRouter } from "./routes/members.js";
import { locationsRouter } from "./routes/locations.js";
import { issuesRouter } from "./routes/issues.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS ?? "*").split(","), credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

app.get("/health", async (_req, res) => {
  const [rows] = await pool.query("SELECT 1 AS ok");
  res.json({ ok: true, db: (rows as any)[0].ok === 1 });
});

app.use("/api/v1/auth", rateLimit({ windowMs: 60_000, max: 20 }), authRouter);
app.use("/api/v1/books", booksRouter);
app.use("/api/v1/members", membersRouter);
app.use("/api/v1/locations", locationsRouter);
app.use("/api/v1/issues", issuesRouter);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API listening on :${port}`));
