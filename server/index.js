import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import { assertDb } from './db.js';
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
app.use('/api', routes);

const port = process.env.PORT || 3001;
app.listen(port, async () => {
  await assertDb();
  console.log(`API listening on http://localhost:${port}`);
});
