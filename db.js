const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(path.join(__dirname, "chat.db"));
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
    text TEXT NOT NULL,
    ts INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

  -- Tracks the last time each side "read" a conversation, so unread
  -- counts survive page reloads and new admin/user sessions.
  CREATE TABLE IF NOT EXISTS read_state (
    user_id TEXT PRIMARY KEY,
    admin_last_read INTEGER NOT NULL DEFAULT 0,
    user_last_read INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const stmts = {
  findUserByEmail: db.prepare("SELECT id, name, email FROM users WHERE email = ? COLLATE NOCASE"),
  insertUser: db.prepare("INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)"),
  insertMessage: db.prepare(
    "INSERT INTO messages (user_id, sender, text, ts) VALUES (?, ?, ?, ?)"
  ),
  getHistory: db.prepare(
    "SELECT sender, text, ts FROM messages WHERE user_id = ? ORDER BY ts ASC"
  ),
  getAllUsersWithUnread: db.prepare(`
    SELECT
      u.id, u.name, u.email,
      (
        SELECT COUNT(*) FROM messages m
        WHERE m.user_id = u.id AND m.sender = 'user'
          AND m.ts > COALESCE((SELECT admin_last_read FROM read_state WHERE user_id = u.id), 0)
      ) AS unread
    FROM users u
    ORDER BY u.name COLLATE NOCASE ASC
  `),
  findUserById: db.prepare("SELECT id, name, email FROM users WHERE id = ?"),
  getUnreadForUser: db.prepare(`
    SELECT COUNT(*) AS unread FROM messages
    WHERE user_id = ? AND sender = 'admin'
      AND ts > COALESCE((SELECT user_last_read FROM read_state WHERE user_id = ?), 0)
  `),
  getUnreadForAdminByUser: db.prepare(`
    SELECT COUNT(*) AS unread FROM messages
    WHERE user_id = ? AND sender = 'user'
      AND ts > COALESCE((SELECT admin_last_read FROM read_state WHERE user_id = ?), 0)
  `),
  markAdminRead: db.prepare(`
    INSERT INTO read_state (user_id, admin_last_read, user_last_read) VALUES (?, ?, 0)
    ON CONFLICT(user_id) DO UPDATE SET admin_last_read = excluded.admin_last_read
  `),
  markUserRead: db.prepare(`
    INSERT INTO read_state (user_id, admin_last_read, user_last_read) VALUES (?, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET user_last_read = excluded.user_last_read
  `),
};

/**
 * Returns the existing user with this email (case-insensitive), or creates
 * a new one. Email is now the real identity — it's how a returning fan is
 * reconnected to their history, and it's where notification emails go.
 * `name` is just the display label shown in the chat UI.
 */
function getOrCreateUser(name, email, nanoid) {
  const existing = stmts.findUserByEmail.get(email);
  if (existing) return existing;
  const id = nanoid();
  stmts.insertUser.run(id, name, email, Date.now());
  return { id, name, email };
}

function saveMessage(userId, sender, text) {
  const ts = Date.now();
  stmts.insertMessage.run(userId, sender, text, ts);
  return ts;
}

function getHistory(userId) {
  return stmts.getHistory.all(userId);
}

function getAllUsersWithUnread() {
  return stmts.getAllUsersWithUnread.all();
}

function getUserById(userId) {
  return stmts.findUserById.get(userId);
}

function getUnreadForUser(userId) {
  return stmts.getUnreadForUser.get(userId, userId).unread;
}

function getUnreadForAdminByUser(userId) {
  return stmts.getUnreadForAdminByUser.get(userId, userId).unread;
}

function markAdminRead(userId, ts = Date.now()) {
  stmts.markAdminRead.run(userId, ts);
}

function markUserRead(userId, ts = Date.now()) {
  stmts.markUserRead.run(userId, ts);
}

module.exports = {
  getOrCreateUser,
  saveMessage,
  getHistory,
  getAllUsersWithUnread,
  getUserById,
  getUnreadForUser,
  getUnreadForAdminByUser,
  markAdminRead,
  markUserRead,
};