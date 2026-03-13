const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// App data directory
const APP_DATA_DIR = path.join(os.homedir(), '.notion-planner');
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

// ─── Debug logger ─────────────────────────────────────────────────────────────
const LOG_PATH = path.join(APP_DATA_DIR, 'debug.log');
fs.writeFileSync(LOG_PATH, `=== Notion Planner started ${new Date().toISOString()} ===\n`);
function log(msg, obj) {
  const line = `[${new Date().toISOString()}] ${msg}${obj !== undefined ? ' ' + JSON.stringify(obj) : ''}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(line.trimEnd());
}
process.on('uncaughtException', (err) => log('UNCAUGHT EXCEPTION', { message: err.message, stack: err.stack }));
process.on('unhandledRejection', (err) => log('UNHANDLED REJECTION', { message: String(err) }));
log('main.js loaded, process versions', process.versions);

// Lazy-load heavy modules after app is ready
let Database, googleApi, notionApi, spotifyApi;

function loadModules() {
  Database = require('better-sqlite3');
  googleApi = require('./renderer/api/google');
  notionApi = require('./renderer/api/notion');
  spotifyApi = require('./renderer/api/spotify');
}

// Initialize SQLite database
function initDatabase() {
  const dbPath = path.join(APP_DATA_DIR, 'tasks.db');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  return db;
}

let mainWindow = null;
let db = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: true,
    backgroundColor: '#191724',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  log('app.whenReady fired');

  loadModules();
  db = initDatabase();

  createWindow();
  log('app ready, window created');
});

app.on('window-all-closed', () => {
  app.quit();
});

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// Config
ipcMain.handle('get-config', () => {
  const configPath = path.join(APP_DATA_DIR, 'config.json');
  if (!fs.existsSync(configPath)) return {};
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch { return {}; }
});

ipcMain.handle('save-config', (_, config) => {
  const configPath = path.join(APP_DATA_DIR, 'config.json');
  const existing = (() => {
    try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch { return {}; }
  })();
  const merged = { ...existing, ...config };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
  return true;
});

ipcMain.handle('check-setup', () => {
  const configPath = path.join(APP_DATA_DIR, 'config.json');
  if (!fs.existsSync(configPath)) return { complete: false };
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const complete = !!(config.setupComplete);
    return { complete, config };
  } catch { return { complete: false }; }
});

// Open URLs in browser
ipcMain.handle('open-external', (_, url) => {
  shell.openExternal(url);
});

// Google Calendar
ipcMain.handle('get-calendar-events', async () => {
  try {
    return await googleApi.getCalendarEvents(APP_DATA_DIR);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('start-google-auth', async () => {
  try {
    // Opens browser, spins up loopback server, waits for callback, saves token.
    return await googleApi.startAuth(APP_DATA_DIR);
  } catch (err) {
    return { error: err.message };
  }
});

// Tasks (SQLite + Notion sync)
ipcMain.handle('get-tasks', () => {
  const today = new Date().toISOString().split('T')[0];
  const rows = db.prepare('SELECT * FROM tasks WHERE date = ? ORDER BY created_at ASC').all(today);
  return rows.map(r => ({ ...r, done: r.done === 1 }));
});

ipcMain.handle('add-task', async (_, text) => {
  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare('INSERT INTO tasks (text, done, date) VALUES (?, 0, ?)').run(text, today);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

  // Sync to Notion async (don't block UI)
  notionApi.addTask(task).catch(console.error);

  return { ...task, done: false };
});

ipcMain.handle('toggle-task', async (_, id) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return null;
  const newDone = task.done === 1 ? 0 : 1;
  db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(newDone, id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  // Sync to Notion async
  notionApi.toggleTask(updated).catch(console.error);

  return { ...updated, done: updated.done === 1 };
});

ipcMain.handle('delete-task', (_, id) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return true;
});

// Spotify
ipcMain.handle('get-spotify-now-playing', async () => {
  try {
    return await spotifyApi.getNowPlaying(APP_DATA_DIR);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('spotify-play-pause', async () => {
  try {
    return await spotifyApi.playPause(APP_DATA_DIR);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('spotify-next', async () => {
  try {
    return await spotifyApi.next(APP_DATA_DIR);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('spotify-prev', async () => {
  try {
    return await spotifyApi.prev(APP_DATA_DIR);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('start-spotify-auth', async () => {
  try {
    return await spotifyApi.startAuth(APP_DATA_DIR, mainWindow);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('complete-spotify-auth', async (_, code) => {
  try {
    return await spotifyApi.completeAuth(APP_DATA_DIR, code);
  } catch (err) {
    return { error: err.message };
  }
});

// Notion Quick Add
ipcMain.handle('quick-add-notion', async (_, { title, body }) => {
  try {
    return await notionApi.quickAdd(title, body);
  } catch (err) {
    return { error: err.message };
  }
});
