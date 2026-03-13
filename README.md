# Notion Planner

A Mac menu bar app that brings together your Google Calendar, daily tasks (synced to Notion), Canvas LMS assignments, and Spotify — all in one compact floating panel.

## Features

- **Cal tab** — Today's Google Calendar events with colored borders
- **Tasks tab** — Local SQLite tasks synced to a Notion database
- **Canvas tab** — Upcoming assignments from Canvas LMS, color-coded by urgency
- **Music tab** — Spotify now-playing with play/pause, next, previous controls
- **Quick Add** — Add notes to a Notion database from any tab

---

## Prerequisites

- Node.js 18+
- npm
- A Mac (uses macOS Tray API)

---

## Installation

```bash
cd notion-planner
cp .env.example .env
npm install
```

Fill in your `.env` file with credentials (see each section below), then:

```bash
npm start
```

---

## Getting Each Credential

### 1. Google Calendar API

**Goal:** Read your Google Calendar events.

**Steps:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Click **"APIs & Services"** → **"Enable APIs and Services"**
4. Search for **"Google Calendar API"** and enable it
5. Go to **"APIs & Services"** → **"Credentials"**
6. Click **"+ Create Credentials"** → **"OAuth client ID"**
7. If prompted, configure the **OAuth consent screen**:
   - User Type: **External**
   - App name: `Notion Planner`
   - Add your email as a test user
   - Scopes: add `https://www.googleapis.com/auth/calendar.readonly`
8. Back in Credentials → Create OAuth client ID:
   - Application type: **Desktop app**
   - Name: `Notion Planner`
9. Copy the **Client ID** and **Client Secret** into your `.env`:
   ```
   GOOGLE_CLIENT_ID=1234567890-abc...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```
10. On first launch, click the **Cal** tab → it will prompt you to authenticate. Click "Open Google Auth URL", sign in, and paste the code shown.

---

### 2. Spotify API

**Goal:** See and control your currently playing track.

**Steps:**

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in and click **"Create App"**
3. Fill in:
   - App name: `Notion Planner`
   - Redirect URI: `http://127.0.0.1:8888/callback` ← **this is critical**
   - Check "Web API"
4. After creating, click **Settings** to find your **Client ID** and **Client Secret**
5. Add to your `.env`:
   ```
   SPOTIFY_CLIENT_ID=abc123...
   SPOTIFY_CLIENT_SECRET=def456...
   ```
6. On first launch setup, click "Open Spotify Auth URL", authorize in browser, then **copy the full URL** from the browser's address bar (it will look like `http://127.0.0.1:8888/callback?code=AQD...`) and paste it into the setup screen.

---

### 3. Canvas LMS API

**Goal:** See upcoming assignments from your courses.

**Steps:**

1. Log into your Canvas instance (e.g., `https://yourschool.instructure.com`)
2. Click your profile picture → **Settings**
3. Scroll down to **"Approved Integrations"**
4. Click **"+ New Access Token"**
5. Purpose: `Notion Planner`, expiry: leave blank for no expiry
6. Click **Generate Token** and copy it immediately (you can't see it again)
7. Add to your `.env`:
   ```
   CANVAS_BASE_URL=https://yourschool.instructure.com
   CANVAS_TOKEN=1234~abcdefghijklmnopqrstuvwxyz...
   ```

---

### 4. Notion Integration

**Goal:** Sync tasks to a "Daily Tasks" database and quick-add to a "Quick Notes" database.

**Step A — Create an integration:**

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name: `Notion Planner`
4. Associated workspace: select your workspace
5. Capabilities: check **Read content**, **Update content**, **Insert content**
6. Click **Submit**, then copy the **Internal Integration Token** (starts with `secret_`)

**Step B — Create the "Daily Tasks" database:**

1. In Notion, create a new page → select **Table** (full page)
2. Name it `Daily Tasks`
3. Add these properties:
   - `Name` (title) — already exists
   - `Done` — type: **Checkbox**
   - `Date` — type: **Date**
4. Click **Share** (top right) → find your integration name → click **Invite**
5. Open the database. The URL looks like:
   `https://notion.so/yourworkspace/32charshex?v=...`
   Copy the **32-character hex ID** (the part before `?v=`)

**Step C — Create the "Quick Notes" database:**

1. Create another Notion page → **Table**
2. Name it `Quick Notes`
3. Properties:
   - `Name` (title)
   - `Body` — type: **Text** (optional, the app uses block content for body)
4. Share with your integration (same as above)
5. Copy the database ID from the URL

**Step D — Add to `.env`:**
```
NOTION_TOKEN=secret_abc123...
NOTION_TASKS_DB_ID=abcdef1234567890abcdef1234567890
NOTION_NOTES_DB_ID=abcdef1234567890abcdef1234567890
```

---

## Running

```bash
npm start          # Run in production mode
npm run dev        # Run in development mode (same, with NODE_ENV=development)
npm run build      # Build a distributable .dmg for Mac
```

---

## Config Files

After setup, credentials are stored in `~/.notion-planner/`:

| File | Purpose |
|------|---------|
| `config.json` | App config: tokens, setup flags, Canvas credentials |
| `google-token.json` | Google OAuth tokens (auto-refreshed) |
| `spotify-token.json` | Spotify OAuth tokens (auto-refreshed) |
| `tasks.db` | SQLite database for local tasks |

To reset and re-run setup, delete `~/.notion-planner/config.json`.

---

## Troubleshooting

**App doesn't appear in menu bar**
- Make sure you're on macOS
- Try `npm start` from the terminal and look for errors

**Google Calendar shows auth error**
- Re-run setup: delete `~/.notion-planner/google-token.json` and `~/.notion-planner/config.json`
- Make sure your Google OAuth consent screen has your email as a test user

**Spotify shows "Nothing playing" when music is on**
- Spotify must be actively playing on a device connected to your account
- Make sure your app has the correct redirect URI: `http://127.0.0.1:8888/callback`
- Try re-authenticating by deleting `~/.notion-planner/spotify-token.json`

**Canvas shows error**
- Verify your `CANVAS_BASE_URL` doesn't have a trailing slash
- Token might have expired — generate a new one in Canvas Settings

**Notion sync fails silently**
- Check that your integration has been shared with both databases
- Verify the database IDs are the 32-char hex strings (not the full URL)

---

## Architecture

```
notion-planner/
├── main.js              Electron main process, IPC handlers, SQLite
├── preload.js           Secure contextBridge exposing window.api
├── package.json
├── .env.example
├── renderer/
│   ├── index.html       Loads React, Tailwind, Babel, component scripts
│   ├── App.jsx          Root component, tab router
│   ├── components/
│   │   ├── SetupScreen.jsx    First-launch OAuth/config wizard
│   │   ├── CalendarTab.jsx    Google Calendar events
│   │   ├── TasksTab.jsx       Local tasks with Notion sync
│   │   ├── CanvasTab.jsx      Canvas LMS assignments
│   │   ├── MusicTab.jsx       Spotify player
│   │   └── QuickAddModal.jsx  Quick Notion page creation
│   └── api/
│       ├── google.js    Google Calendar OAuth + events
│       ├── notion.js    Notion API: tasks + quick add
│       ├── canvas.js    Canvas LMS assignments
│       └── spotify.js   Spotify OAuth + playback control
└── README.md
```
