const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { shell } = require('electron');

const APP_DATA_DIR = path.join(os.homedir(), '.notion-planner');

function getConfig() {
  const configPath = path.join(APP_DATA_DIR, 'config.json');
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch { return {}; }
}

function getClientId() {
  const config = getConfig();
  return config.spotifyClientId || process.env.SPOTIFY_CLIENT_ID;
}

function getClientSecret() {
  const config = getConfig();
  return config.spotifyClientSecret || process.env.SPOTIFY_CLIENT_SECRET;
}
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

function getTokenPath(appDataDir) {
  return path.join(appDataDir, 'spotify-token.json');
}

function loadToken(appDataDir) {
  const tokenPath = getTokenPath(appDataDir);
  if (!fs.existsSync(tokenPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  } catch {
    return null;
  }
}

function saveToken(appDataDir, token) {
  fs.writeFileSync(getTokenPath(appDataDir), JSON.stringify(token, null, 2));
}

async function refreshToken(appDataDir, token) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured');

  const response = await axios.post('https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    }).toString(),
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
  );

  const newToken = {
    ...token,
    access_token: response.data.access_token,
    expires_at: Date.now() + (response.data.expires_in * 1000),
  };
  if (response.data.refresh_token) {
    newToken.refresh_token = response.data.refresh_token;
  }
  saveToken(appDataDir, newToken);
  return newToken;
}

async function getValidToken(appDataDir) {
  let token = loadToken(appDataDir);
  if (!token) throw new Error('Spotify not authenticated. Please complete setup.');

  // Refresh if expired (with 60s buffer)
  if (token.expires_at && Date.now() > token.expires_at - 60000) {
    token = await refreshToken(appDataDir, token);
  }

  return token;
}

function getAuthHeaders(token) {
  return { 'Authorization': `Bearer ${token.access_token}` };
}

async function startAuth(appDataDir, mainWindow) {
  const clientId = getClientId();
  if (!clientId) {
    return { error: 'Spotify Client ID must be configured in settings.' };
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return { authUrl };
}

async function completeAuth(appDataDir, redirectUrl) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  if (!clientId || !clientSecret) {
    return { error: 'Spotify credentials not configured in settings.' };
  }

  // Extract code from the full redirect URL
  let code;
  try {
    const url = new URL(redirectUrl);
    code = url.searchParams.get('code');
  } catch {
    // Maybe they pasted just the code
    code = redirectUrl.trim();
  }

  if (!code) return { error: 'Could not extract authorization code from URL' };

  const response = await axios.post('https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
  );

  const token = {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    expires_at: Date.now() + (response.data.expires_in * 1000),
  };

  saveToken(appDataDir, token);
  return { success: true };
}

async function getNowPlaying(appDataDir) {
  let token;
  try {
    token = await getValidToken(appDataDir);
  } catch (e) {
    return { error: e.message };
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player', {
      headers: getAuthHeaders(token),
    });

    if (response.status === 204 || !response.data) {
      return null; // Nothing playing
    }

    return response.data;
  } catch (e) {
    if (e.response?.status === 401) {
      // Token invalid, clear it
      return { error: 'Spotify session expired. Please re-authenticate.' };
    }
    return { error: e.message };
  }
}

async function playPause(appDataDir) {
  const token = await getValidToken(appDataDir);

  // Get current state first
  const state = await getNowPlaying(appDataDir);
  const isPlaying = state?.is_playing;

  if (isPlaying) {
    await axios.put('https://api.spotify.com/v1/me/player/pause', {}, {
      headers: getAuthHeaders(token)
    });
  } else {
    await axios.put('https://api.spotify.com/v1/me/player/play', {}, {
      headers: getAuthHeaders(token)
    });
  }

  return { success: true };
}

async function next(appDataDir) {
  const token = await getValidToken(appDataDir);
  await axios.post('https://api.spotify.com/v1/me/player/next', {}, {
    headers: getAuthHeaders(token)
  });
  return { success: true };
}

async function prev(appDataDir) {
  const token = await getValidToken(appDataDir);
  await axios.post('https://api.spotify.com/v1/me/player/previous', {}, {
    headers: getAuthHeaders(token)
  });
  return { success: true };
}

module.exports = { startAuth, completeAuth, getNowPlaying, playPause, next, prev, getQueue, toggleShuffle, toggleRepeat };

async function getQueue(appDataDir) {
  let token;
  try { token = await getValidToken(appDataDir); } catch (e) { return { error: e.message }; }
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/queue', {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (e) { return { error: e.message }; }
}

async function toggleShuffle(appDataDir, state) {
  const token = await getValidToken(appDataDir);
  await axios.put(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {}, {
    headers: getAuthHeaders(token)
  });
  return { success: true };
}

async function toggleRepeat(appDataDir, state) {
  const token = await getValidToken(appDataDir);
  await axios.put(`https://api.spotify.com/v1/me/player/repeat?state=${state}`, {}, {
    headers: getAuthHeaders(token)
  });
  return { success: true };
}

async function getQueue(appDataDir) {
  let token;
  try { token = await getValidToken(appDataDir); } catch (e) { return { error: e.message }; }
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/queue', {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (e) { return { error: e.message }; }
}

async function toggleShuffle(appDataDir, state) {
  const token = await getValidToken(appDataDir);
  await axios.put(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {}, {
    headers: getAuthHeaders(token)
  });
  return { success: true };
}

async function toggleRepeat(appDataDir, state) {
  const token = await getValidToken(appDataDir);
  await axios.put(`https://api.spotify.com/v1/me/player/repeat?state=${state}`, {}, {
    headers: getAuthHeaders(token)
  });
  return { success: true };
}
