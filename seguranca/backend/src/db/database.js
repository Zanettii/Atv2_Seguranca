const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/signatures.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  }
  return db;
}

function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS key_pairs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      private_key_enc TEXT NOT NULL,
      algorithm TEXT NOT NULL DEFAULT 'RSA-SHA256',
      key_size INTEGER NOT NULL DEFAULT 2048,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS signatures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text_content TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      signature TEXT NOT NULL,
      algorithm TEXT NOT NULL DEFAULT 'RSA-SHA256',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_logs (
      id TEXT PRIMARY KEY,
      signature_id TEXT,
      result TEXT NOT NULL CHECK(result IN ('VALID', 'INVALID')),
      verified_at TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address TEXT,
      method TEXT NOT NULL DEFAULT 'by_id',
      details TEXT
    );
  `);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
