import { config } from 'dotenv';
config({ path: new URL('../.env', import.meta.url) });
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

// Export a reusable query helper
export async function query(text, params) {
  return pool.query(text, params);
}

export async function assertDb() {
  const { rows } = await pool.query('SELECT 1 AS ok');
  if (rows[0]?.ok !== 1) throw new Error('Database connection test failed');
  console.log('✅ Database ready');
}


export default pool;

/* 
pool.connect().then(() => {
    console.log("Connected to the database successfully!");
}).catch((err) => {
    console.error("Database connection error:", err.stack);
});

*/

