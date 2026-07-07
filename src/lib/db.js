import { openDatabaseAsync } from 'expo-sqlite';

const SCHEMA_VERSION = '1';

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('native_pandas.db');
  }
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS card_state (
      card_id TEXT PRIMARY KEY,
      ef REAL DEFAULT 2.5, interval INTEGER DEFAULT 0, reps INTEGER DEFAULT 0,
      due_date TEXT NOT NULL, last_grade INTEGER, reviewed_at TEXT,
      favorite INTEGER DEFAULT 0, note TEXT
    );
    CREATE TABLE IF NOT EXISTS review_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT NOT NULL,
      grade INTEGER NOT NULL, reviewed_at TEXT NOT NULL, interval INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
  `);

  const versionRow = await db.getFirstAsync(
    `SELECT value FROM app_meta WHERE key = 'schema_version'`
  );
  if (!versionRow) {
    await db.runAsync(
      `INSERT INTO app_meta (key, value) VALUES ('schema_version', ?)`,
      SCHEMA_VERSION
    );
  }
  // Guarded migrations: when the schema changes, bump SCHEMA_VERSION and add
  // an explicit `if (versionRow.value < 'N') { ... }` migration step here —
  // never silently drop or rewrite existing user tables.

  return db;
}
