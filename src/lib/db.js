import { openDatabaseAsync } from 'expo-sqlite';

const DB_NAME = 'native_pandas.db';

// 1 → 2: per-device provenance on review_log (see migrate() below).
const SCHEMA_VERSION = 2;

// The SQLiteDatabase methods `lib/` uses. Everything goes through the facade
// below, so any new method has to be listed here first.
const DB_METHODS = ['execAsync', 'getAllAsync', 'getFirstAsync', 'runAsync', 'withTransactionAsync'];

let dbPromise = null;

function openRaw() {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME).catch((error) => {
      dbPromise = null; // never cache a failed open — the next call retries
      throw error;
    });
  }
  return dbPromise;
}

// A dev reload (and app backgrounding on Android) can release the native
// database while this module's cached promise survives, after which every
// query rejects with "Cannot use shared object that was already released".
// Recognise that one failure, drop the dead handle, and reopen once.
function isReleasedHandle(error) {
  return String(error?.message ?? error).includes('already released');
}

async function call(method, args) {
  const raw = await openRaw();
  try {
    return await raw[method](...args);
  } catch (error) {
    if (!isReleasedHandle(error)) throw error;
    dbPromise = null;
    const reopened = await openRaw();
    return reopened[method](...args);
  }
}

// Stable stand-in for the SQLiteDatabase handle: callers hold this forever
// while the native database underneath can be swapped out after a release.
const dbFacade = Object.fromEntries(
  DB_METHODS.map((method) => [method, (...args) => call(method, args)])
);

export function getDb() {
  return Promise.resolve(dbFacade);
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
      grade INTEGER NOT NULL, reviewed_at TEXT NOT NULL, interval INTEGER NOT NULL,
      -- Provenance, for accounts studied on more than one device. NULL on both
      -- means "this device wrote it"; a row imported from another install
      -- carries that install's device_id and its id there (origin_id), which is
      -- what makes re-importing idempotent and stops us pushing it back.
      device_id TEXT, origin_id INTEGER,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
  `);

  await migrate(db);

  return db;
}

// Guarded migrations: bump SCHEMA_VERSION and add an explicit step below.
// Never silently drop or rewrite existing user tables.
async function migrate(db) {
  const versionRow = await db.getFirstAsync(
    `SELECT value FROM app_meta WHERE key = 'schema_version'`
  );
  const from = versionRow ? Number(versionRow.value) : 0;
  if (from >= SCHEMA_VERSION) return;

  if (from < 2) {
    // Columns are already in the CREATE TABLE above, so these only fire for
    // databases created before v2.
    await addColumnIfMissing(db, 'review_log', 'device_id', 'TEXT');
    await addColumnIfMissing(db, 'review_log', 'origin_id', 'INTEGER');
    await addColumnIfMissing(db, 'review_log', 'synced', 'INTEGER NOT NULL DEFAULT 0');
    // Partial index: our own rows all have a NULL device_id and must stay
    // free to repeat, imported rows must not.
    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS review_log_origin
        ON review_log (device_id, origin_id) WHERE device_id IS NOT NULL;
    `);
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('schema_version', ?)`,
    String(SCHEMA_VERSION)
  );
}

async function addColumnIfMissing(db, table, column, definition) {
  const columns = await db.getAllAsync(`PRAGMA table_info(${table})`);
  if (columns.some((c) => c.name === column)) return;
  await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
