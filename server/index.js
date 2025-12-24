import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import { assertDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', routes);

const port = process.env.PORT || 3001;
app.listen(port, async () => {
  await assertDb();
  console.log(`API listening on http://localhost:${port}`);
});
