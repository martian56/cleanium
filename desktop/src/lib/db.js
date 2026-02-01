const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function getDbPath() {
  const { app } = require('electron');
  const userData = app.getPath('userData');
  return path.join(userData, 'cleanium.db');
}

function init() {
  if (db) return db;
  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  createTables();
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      root_paths TEXT NOT NULL,
      item_count INTEGER NOT NULL,
      total_bytes INTEGER NOT NULL,
      duration_ms INTEGER
    );
    CREATE TABLE IF NOT EXISTS findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (scan_id) REFERENCES scans(id)
    );
    CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
  `);
}

function insertScan(rootPaths, items, durationMs) {
  init();
  const created_at = Date.now();
  const root_paths = JSON.stringify(rootPaths || []);
  const item_count = items.length;
  const total_bytes = items.reduce((s, i) => s + (i.size || 0), 0);
  const stmt = db.prepare(
    'INSERT INTO scans (created_at, root_paths, item_count, total_bytes, duration_ms) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(created_at, root_paths, item_count, total_bytes, durationMs ?? null);
  const scanId = db.prepare('SELECT last_insert_rowid()').get()['last_insert_rowid()'];
  const insertFinding = db.prepare(
    'INSERT INTO findings (scan_id, path, size, category, description) VALUES (?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction((findings) => {
    for (const f of findings) {
      insertFinding.run(scanId, f.path, f.size, f.category, f.description || '');
    }
  });
  insertMany(items);
  return scanId;
}

function getScans() {
  init();
  const rows = db.prepare(
    'SELECT id, created_at, root_paths, item_count, total_bytes, duration_ms FROM scans ORDER BY created_at DESC LIMIT 100'
  ).all();
  return rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    root_paths: r.root_paths,
    item_count: r.item_count,
    total_bytes: r.total_bytes,
    duration_ms: r.duration_ms,
  }));
}

function getFindings(scanId) {
  init();
  const rows = db.prepare(
    'SELECT id, path, size, category, description FROM findings WHERE scan_id = ? ORDER BY size DESC'
  ).all(scanId);
  return rows.map((r) => ({
    id: r.id,
    path: r.path,
    size: r.size,
    category: r.category,
    description: r.description,
  }));
}

function deleteScan(scanId) {
  init();
  const delFindings = db.prepare('DELETE FROM findings WHERE scan_id = ?');
  const delScan = db.prepare('DELETE FROM scans WHERE id = ?');
  db.transaction(() => {
    delFindings.run(scanId);
    delScan.run(scanId);
  })();
}

module.exports = { init, getDbPath, insertScan, getScans, getFindings, deleteScan, createTables };
