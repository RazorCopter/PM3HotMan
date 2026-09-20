const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
    const win = new BrowserWindow({ width: 900, height: 600 });
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
});
