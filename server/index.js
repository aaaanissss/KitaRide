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
app.use(cors());
app.use(express.json());
app.use('/attraction-icons', express.static(path.join(__dirname, 'attraction_icon')));

// API routes
app.use('/api', routes);

const port = process.env.PORT || 3001;
app.listen(port, async () => {
  await assertDb();
  console.log(`API listening on http://localhost:${port}`);
});
