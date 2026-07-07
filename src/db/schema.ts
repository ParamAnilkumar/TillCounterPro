import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('tillcounter.db');

export const initDb = async () => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS denominations (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      type TEXT NOT NULL,
      sortOrder INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tills (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      expectedFloat REAL NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS count_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      tillId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      expectedFloat REAL NOT NULL,
      actualTotal REAL NOT NULL,
      difference REAL NOT NULL,
      managerName TEXT,
      notes TEXT,
      FOREIGN KEY (tillId) REFERENCES tills (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS count_items (
      id TEXT PRIMARY KEY NOT NULL,
      sessionId TEXT NOT NULL,
      denominationId TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES count_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (denominationId) REFERENCES denominations (id) ON DELETE RESTRICT
    );
  `);

  try {
    await db.execAsync(`ALTER TABLE count_sessions ADD COLUMN sessionType TEXT DEFAULT 'closing';`);
  } catch (e) {
    // Column might already exist, ignore
  }
};
