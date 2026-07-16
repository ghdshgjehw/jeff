require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");
const db = require("./db");
const email = require("./email");

// ---- Config ----------------------------------------------------------
// Change this to a strong secret before deploying. Whoever connects the
// admin page with this key becomes the admin. Keep it out of source
// control in a real deployment (use an environment variable instead).
const ADMIN_KEY = process.env.ADMIN_KEY || "dbook";
const PORT = process.env.PORT || 3000;

// ---- App setup ---------------------------------------------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PUBLIC_DIR = path.join(__dirname, "public");

// Serve real files (css, js, images, and exact *.html requests) first.
app.use(express.static(PUBLIC_DIR));

// Lightweight health-check endpoint for uptime pingers (UptimeRobot,
// cron-job.org, etc.) to hit every few minutes and keep the free-tier
// instance from spinning down. Deliberately does no DB/email work so
// it responds instantly and doesn't count as "real" load.
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// Clean-URL fallback: turns "/about" into a request for "public/about.html"
// behind the scenes, so the .html extension never has to appear in a link
// or in the address bar. Only matches single-segment, extensionless paths
// (e.g. "/about"), so it never interferes with "/css/style.css" or
// "/socket.io/..." which are handled above.
app.get("/:page", (req, res, next) => {
  const page = req.params.page;
  if (page.includes(".")) return next(); // has its own extension, not for us
  const filePath = path.join(PUBLIC_DIR, `${page}.html`);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return next();
    res.sendFile(filePath);
  });
});

// ---- In-memory connection tracking (who's online right now) ------------
// onlineUsers: Map<userId, Set<socketId>>  (supports multiple tabs per user)
const onlineUsers = new Map();
// socketToUser: Map<socketId, userId>  (for cleanup on disconnect)
const socketToUser = new Map();
// admins: Set<socketId>
const admins = new Set();

function isOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

function broadcastToAdmins(event, payload) {
  admins.forEach((socketId) => io.to(socketId).emit(event, payload));
}

function sendToUser(userId, event, payload) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.forEach((socketId) => io.to(socketId).emit(event, payload));
}

io.on("connection", (socket) => {
  let role = null; // "admin" | "user"
  let userId = null;

  // --- Identify as admin ---
  socket.on("admin_login", ({ key }) => {
    if (key !== ADMIN_KEY) {
      socket.emit("admin_login_result", { ok: false, error: "Invalid admin key" });
      return;
    }
    role = "admin";
    admins.add(socket.id);
    socket.emit("admin_login_result", { ok: true });

    const allUsers = db.getAllUsersWithUnread().map((u) => ({ ...u, online: isOnline(u.id) }));
    socket.emit("user_list", allUsers);
  });

  // --- Admin requests full history for a specific user, and reading it
  // marks their unread count as cleared. ---
  socket.on("admin_select_user", ({ userId: targetId }) => {
    if (role !== "admin") return;
    const user = db.getUserById(targetId);
    if (!user) return;
    db.markAdminRead(targetId);
    socket.emit("user_history", { userId: targetId, history: db.getHistory(targetId) });
    broadcastToAdmins("unread_update", { userId: targetId, unread: 0 });
  });

  // --- Identify / log in as a regular user by email ---
  // Email is the real identity now — if this address was used before,
  // their history and unread count load. `name` is just the display label.
  socket.on("user_join", ({ name, email: emailInput }) => {
    if (role) return; // already identified
    const trimmedName = (name || "").trim().slice(0, 40);
    const trimmedEmail = (emailInput || "").trim().slice(0, 200).toLowerCase();
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!trimmedName) {
      socket.emit("join_error", { error: "Please enter a name" });
      return;
    }
    if (!emailLooksValid) {
      socket.emit("join_error", { error: "Please enter a valid email" });
      return;
    }

    role = "user";
    const user = db.getOrCreateUser(trimmedName, trimmedEmail, nanoid);
    userId = user.id;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    socketToUser.set(socket.id, userId);

    const history = db.getHistory(userId);
    const unreadCount = db.getUnreadForUser(userId);
    socket.emit("joined", { id: userId, name: user.name, history, unreadCount });

    broadcastToAdmins("user_online", { id: userId, name: user.name, email: user.email });
  });

  // --- User marks the conversation as read (e.g. opened the chat panel) ---
  socket.on("user_read", () => {
    if (role !== "user" || !userId) return;
    db.markUserRead(userId);
  });

  // --- User sends a message: it can ONLY go to the admin(s). ---
  // We ignore any "to" field a user might try to send — the server, not
  // the client, decides where messages are routed.
  socket.on("user_message", ({ text }) => {
    if (role !== "user" || !userId || !text) return;
    const cleanText = String(text).slice(0, 2000);
    const ts = db.saveMessage(userId, "user", cleanText);
    const msg = { from: userId, text: cleanText, ts };

    broadcastToAdmins("message_from_user", msg);
    broadcastToAdmins("unread_update", { userId, unread: db.getUnreadForAdminByUser(userId) });
    sendToUser(userId, "message_sent", msg); // echoes to all of this user's open tabs

    // No admin dashboard currently open anywhere — email the admin so the
    // message doesn't sit unseen.
    if (admins.size === 0) {
      const fan = db.getUserById(userId);
      if (fan) email.sendAdminAlert(fan.name, fan.email, cleanText);
    }
  });

  // --- Admin sends a message to a specific user ---
  socket.on("admin_message", ({ toUserId, text }) => {
    if (role !== "admin" || !toUserId || !text) return;
    const user = db.getUserById(toUserId);
    if (!user) {
      socket.emit("admin_error", { error: "Unknown user" });
      return;
    }
    const cleanText = String(text).slice(0, 2000);
    const ts = db.saveMessage(toUserId, "admin", cleanText);
    const msg = { toUserId, text: cleanText, ts };

    sendToUser(toUserId, "message_from_admin", msg);
    broadcastToAdmins("admin_message_sent", msg); // syncs multiple admin sessions

    // This fan has no open tab/widget connected right now — email them so
    // the reply doesn't sit unseen.
    if (!isOnline(toUserId)) {
      email.sendFanAlert(user.email, user.name, cleanText);
    }
  });

  socket.on("disconnect", () => {
    if (role === "admin") {
      admins.delete(socket.id);
    } else if (role === "user" && userId) {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          broadcastToAdmins("user_offline", { id: userId });
        }
      }
      socketToUser.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Admin chat server running on http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}/admin.html`);
  console.log(`User page:  http://localhost:${PORT}/index.html`);
});