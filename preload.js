const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Config / Setup
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  checkSetup: () => ipcRenderer.invoke('check-setup'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Google Calendar
  getCalendarEvents: () => ipcRenderer.invoke('get-calendar-events'),
  startGoogleAuth: () => ipcRenderer.invoke('start-google-auth'),
  createCalendarEvent: (eventData) => ipcRenderer.invoke('create-calendar-event', eventData),

  // Tasks
  getTasks: () => ipcRenderer.invoke('get-tasks'),
    reorderTasks: (ids) => ipcRenderer.invoke('reorder-tasks', ids),
  addTask: (text) => ipcRenderer.invoke('add-task', text),
  toggleTask: (id) => ipcRenderer.invoke('toggle-task', id),
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),

  // Spotify
  getSpotifyNowPlaying: () => ipcRenderer.invoke('get-spotify-now-playing'),
  spotifyPlayPause: () => ipcRenderer.invoke('spotify-play-pause'),
  spotifyNext: () => ipcRenderer.invoke('spotify-next'),
  spotifyPrev: () => ipcRenderer.invoke('spotify-prev'),
    getSpotifyQueue: () => ipcRenderer.invoke('spotify-queue'),
    spotifyShuffle: (state) => ipcRenderer.invoke('spotify-shuffle', state),
    spotifyRepeat: (state) => ipcRenderer.invoke('spotify-repeat', state),
  startSpotifyAuth: () => ipcRenderer.invoke('start-spotify-auth'),
  completeSpotifyAuth: (code) => ipcRenderer.invoke('complete-spotify-auth', code),

  // Notion Quick Add
  quickAddNotion: (title, body) => ipcRenderer.invoke('quick-add-notion', { title, body }),
});
