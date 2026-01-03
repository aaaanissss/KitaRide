import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import routes from './routes.js';
import { assertDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = corsOrigins.length > 0 ? corsOrigins : defaultCorsOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use('/attraction-icons', express.static(path.join(__dirname, 'attraction_icon')));

// API routes
app.use('/api', routes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3001;
app.listen(port, async () => {
  await assertDb();
  console.log(`API listening on http://localhost:${port}`);
});
