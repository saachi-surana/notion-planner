const { google } = require('googleapis');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function getConfig() {
  const configPath = path.join(os.homedir(), '.notion-planner', 'config.json');
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch { return {}; }
}

function getClientId() {
  const config = getConfig();
  return config.googleClientId || process.env.GOOGLE_CLIENT_ID;
}

function getClientSecret() {
  const config = getConfig();
  return config.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
}

function getTokenPath(appDataDir) {
  return path.join(appDataDir, 'google-token.json');
}

function loadToken(appDataDir) {
  const tokenPath = getTokenPath(appDataDir);
  if (!fs.existsSync(tokenPath)) return null;
  try { return JSON.parse(fs.readFileSync(tokenPath, 'utf8')); }
  catch { return null; }
}

function saveToken(appDataDir, token) {
  fs.writeFileSync(getTokenPath(appDataDir), JSON.stringify(token, null, 2));
}

// Find a free port by binding to :0 and immediately closing
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// Full loopback OAuth flow:
// 1. Spin up a temporary HTTP server on a random port
// 2. Build the auth URL with http://127.0.0.1:{port}/callback as redirect_uri
// 3. Open the URL in the default browser
// 4. Wait for Google to redirect back with ?code=...
// 5. Exchange code for tokens, save, shut down server
async function startAuth(appDataDir) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) {
    return { error: 'Google Client ID and Secret must be configured in settings.' };
  }

  const port = await getFreePort();
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  // Open browser
  const { shell } = require('electron');
  shell.openExternal(authUrl);

  // Wait for callback
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname !== '/callback') {
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="font:16px sans-serif;padding:32px">Authorization cancelled. You can close this tab.</body></html>');
        server.close();
        resolve({ error: `Google auth cancelled: ${error}` });
        return;
      }

      if (!code) {
        res.end('Missing code');
        server.close();
        resolve({ error: 'No authorization code received' });
        return;
      }

      // Exchange code for tokens
      try {
        const { tokens } = await oauth2Client.getToken(code);
        saveToken(appDataDir, tokens);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="font:16px sans-serif;padding:32px;background:#1e1e1e;color:#fff"><b style="color:#1D9E75">✓ Google Calendar connected!</b><br><br>You can close this tab and return to Notion Planner.</body></html>');
        server.close();
        resolve({ success: true });
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><body style="font:16px sans-serif;padding:32px">Error: ${e.message}. Close this tab and try again.</body></html>`);
        server.close();
        resolve({ error: e.message });
      }
    });

    server.listen(port, '127.0.0.1');

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      server.close();
      resolve({ error: 'Authorization timed out after 5 minutes' });
    }, 5 * 60 * 1000);

    server.on('close', () => clearTimeout(timeout));
  });
}

async function getAuthorizedClient(appDataDir) {
  const token = loadToken(appDataDir);
  if (!token) throw new Error('Google not authenticated. Please complete setup.');

  // We need the redirect_uri to match what was used during auth.
  // For token refresh it doesn't matter, but OAuth2 client still requires one.
  const oauth2Client = new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    'http://127.0.0.1'
  );
  oauth2Client.setCredentials(token);

  // Auto-refresh if expired
  if (token.expiry_date && Date.now() > token.expiry_date - 60000) {
    if (!token.refresh_token) {
      throw new Error('Google token expired and no refresh token available. Please re-authenticate.');
    }
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      // Google does not return refresh_token on refresh — merge to preserve it
      const updatedToken = { ...token, ...credentials };
      saveToken(appDataDir, updatedToken);
      oauth2Client.setCredentials(updatedToken);
    } catch (e) {
      throw new Error('Google token expired and refresh failed. Please re-authenticate.');
    }
  }

  return oauth2Client;
}

async function getCalendarEvents(appDataDir) {
  if (!getClientId()) {
    return { error: 'Google Calendar not configured' };
  }

  let oauth2Client;
  try {
    oauth2Client = await getAuthorizedClient(appDataDir);
  } catch (e) {
    return { error: e.message };
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });

  return response.data.items || [];
}

async function createCalendarEvent(appDataDir, { title, date, startTime, endTime, colorId }) {
  let oauth2Client;
  try {
    oauth2Client = await getAuthorizedClient(appDataDir);
  } catch (e) {
    return { error: e.message };
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  let start, end;
  if (startTime) {
    start = { dateTime: `${date}T${startTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    end   = { dateTime: `${date}T${(endTime || startTime)}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  } else {
    start = { date };
    end   = { date };
  }

  const resource = { summary: title, start, end };
  if (colorId) resource.colorId = colorId;

  try {
    const response = await calendar.events.insert({ calendarId: 'primary', resource });
    return response.data;
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = { startAuth, getCalendarEvents, createCalendarEvent };
