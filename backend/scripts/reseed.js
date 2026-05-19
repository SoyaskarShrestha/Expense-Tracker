import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveSqlitePath() {
  const configuredPath = process.env.SQLITE_PATH || './data/expense-tracker.sqlite';
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.join(__dirname, '..', configuredPath);
}

async function removeIfPresent(filePath) {
  await fs.rm(filePath, { force: true });
}

async function reseedDatabase() {
  const sqlitePath = resolveSqlitePath();
  const relatedPaths = [sqlitePath, `${sqlitePath}-shm`, `${sqlitePath}-wal`];

  await Promise.all(relatedPaths.map(removeIfPresent));

  console.log(`Deleted SQLite database files for reseed: ${relatedPaths.join(', ')}`);
  console.log('Restart the backend to recreate the database from data/db.json.');
}

reseedDatabase().catch((error) => {
  console.error('Failed to remove SQLite database files.');
  console.error(error);
  process.exit(1);
});
