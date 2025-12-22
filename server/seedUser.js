import bcrypt from 'bcrypt';
import { query } from './db.js';

async function createUser() {
  const username = 'testuser';
  const plainPassword = 'test123';
  const role = 'commuter';

  const password_hash = await bcrypt.hash(plainPassword, 10);

  const result = await query(
    'INSERT INTO "USER" (username, password_hash, role) VALUES ($1, $2, $3) RETURNING userid, username, role',
    [username, password_hash, role]
  );

  console.log('Created user:', result.rows[0]);
}

createUser()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error creating user:', err);
    process.exit(1);
  });
