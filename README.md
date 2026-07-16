# Wren Cassidy — Artist Site + Community Chat

A full artist/brand website (fictional artist "Wren Cassidy") with a support-style chat system built in: fans message the admin directly, the admin replies from a dashboard, and both sides get unread-message indicators.

## Site structure

- `public/index.html` — Home (cinematic hero, latest release, gallery/video previews, chat CTA)
- `public/music.html` — Full discography
- `public/gallery.html` — Photo grid
- `public/videos.html` — Video grid
- `public/store.html` — Merch
- `public/about.html` — Bio + career timeline
- `public/contact.html` — Contact form + chat callout
- `public/admin.html` — Admin dashboard (not linked in nav — bookmark it directly)
- `public/css/style.css` — Design tokens (color/type/spacing) and all component styles
- `public/js/shared.js` — Injects the nav/footer on every page, handles the dark/light toggle, scroll-reveal animations, and the floating chat widget

No photos are used anywhere on the site — visuals are generated gradients, grain textures, and SVG, since this was built for a fictional artist rather than a real person's likeness.

## Setup

```bash
npm install
npm start
```

Then open:
- **The site**: http://localhost:3000 — this is the homepage; use the nav to browse, and click **Chat** (or the floating bubble in the corner) to message the admin.
- **Admin dashboard**: http://localhost:3000/admin.html — log in with the admin key below.

Set an admin key (or just edit the default in `server.js`):

```bash
# macOS/Linux
export ADMIN_KEY="your-secret-key"

# Windows (PowerShell)
$env:ADMIN_KEY="your-secret-key"
```

## The chat widget

A floating chat bubble (bottom-right) appears on every page, and the nav's **Chat** link opens the same widget instead of navigating away. It's the same username-based system built earlier:
- Enter a name once — it's remembered in the browser (`localStorage`), so returning visitors are reconnected to their history automatically without retyping it.
- Messages only ever go to the admin; users can't message each other (enforced server-side, as before).

## Unread message indicators

Both directions now show unread counts, persisted in the database (`read_state` table) so they survive page reloads and new logins — not just tracked in memory:

- **Fans**: a badge appears on the chat bubble and on the nav "Chat" link whenever the admin has replied and the widget hasn't been opened since. Opening the widget clears it.
- **Admin dashboard**: each user in the sidebar shows a red badge with their unread count, and conversations with unread messages sort to the top. Selecting a user clears their badge and marks the conversation read.

## Chat history & the database

Chats are persisted using **Node's built-in SQLite module** (`node:sqlite`) — no separate database package to install, and critically, **nothing to compile**. This avoids a common Windows headache: the popular `better-sqlite3` package requires a C++ build toolchain (Visual Studio Build Tools) to install, which most machines don't have set up. `node:sqlite` ships inside Node itself, so `npm install` only needs to fetch plain JavaScript packages.

**Requirement:** Node.js 22.5 or newer (you can check with `node -v`). On Node 22.5–23.x it works but logs an "experimental feature" warning — that's expected and harmless. On Node 24+ it's stable and silent.

A file called `chat.db` is created automatically in the project folder the first time you run the server. Two tables live in it:

- `users` — one row per username (case-insensitive), assigned a permanent internal ID the first time they chat.
- `messages` — every message, tagged with sender (`user` or `admin`) and a timestamp.

**How "login with username" works:** when someone types a name into the chat widget, the server checks if that name already exists (case-insensitively). If it does, they're reconnected to that same user record and their full message history loads immediately. If not, a new user is created. There's no password — anyone who types an existing name gets that history. See the security note below.

The admin dashboard now shows **every user who has ever chatted**, not just who's currently online — with a green/gray dot for online status. Clicking a user always pulls their latest history fresh from the database.

Back up or move your data by copying `chat.db` (and its `chat.db-wal` / `chat.db-shm` files, created by SQLite's write-ahead log) — just make sure the server isn't running when you copy them, or use `sqlite3 chat.db ".backup backup.db"`.

## Suggestions

- **Add real authentication.** Right now, usernames aren't protected — anyone who knows or guesses an existing name can see that user's history. For anything beyond casual/internal use, add a password or a persistent random token stored in the browser (e.g. a cookie or `localStorage`-issued ID) so a name can't be "stolen." I can build either version if useful.
- **Typing indicators & read receipts.** Nice UX additions, a few more Socket.IO events each.
- **Message pagination.** Fine as-is for normal chat volumes; if a user builds up thousands of messages, load the last N and "load more" on scroll instead of the whole history at once.
- **File/image attachments.** Would need a small upload endpoint plus storage (local disk or S3) — not included here, but a common next step for support chat.
- **Rate limiting.** Consider capping messages per second per socket to prevent spam/abuse, especially if this is public-facing.

## Notes for production use

- **Change `ADMIN_KEY`** to something strong and set it as an environment variable — don't leave the default in code.
- **Multiple admins**: the server already supports more than one admin connecting at once — they all see the same user list, online status, and incoming messages in sync.
- **Deploying**: this needs a host that supports persistent WebSocket connections *and* a persistent filesystem for `chat.db` (Render, Railway, Fly.io, a VPS). Serverless platforms like plain Vercel functions won't work — no long-lived process, and no durable disk for the SQLite file.
- **HTTPS**: deploy behind HTTPS in production so the admin key isn't sent in plaintext.
