const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 400, height: 200 });
  win.loadURL('data:text/html,<body style="font:24px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">Notion Planner is working</body>');
});
