// PM3 HotMan GUI — Electron Main Process
// Manages window lifecycle, IPC, COM port scanning, and pm3 process

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ─── Redirect userData to a clean writable path ─────────────────────────────────
app.setPath('userData', path.join(os.tmpdir(), 'pm3-hotman-data'));


let pm3Process = null;
let pm3Pty    = null;
let isDev     = process.argv.includes('--dev');

// Buffer that captures output before the dashboard window is ready
const outputBuffer = [];
const MAX_BUFFER   = 200; // lines

// ─── Utility: broadcast to ALL open windows ─────────────────────────────────
// Buffers output so early pm3 messages aren't lost during window transition.
function broadcast(channel, data) {
    const wins = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed());
    if (channel === 'pm3:output') {
        // Buffer lines for replay when dashboard loads
        outputBuffer.push(data);
        if (outputBuffer.length > MAX_BUFFER) outputBuffer.shift();
    }
    for (const win of wins) {
        win.webContents.send(channel, data);
    }
}

// ─── Window Management ────────────────────────────────────────────────────────

function makePrefs() {
    return {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
    };
}

function createConnectWindow() {
    const win = new BrowserWindow({
        width: 900, height: 620,
        minWidth: 800, minHeight: 560,
        frame: false,
        backgroundColor: '#0a0a0f',
        webPreferences: makePrefs(),
        show: false,
    });

    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    win.once('ready-to-show', () => {
        win.center();
        win.show();
        win.focus();
    });
    // Failsafe: show after 4s regardless
    setTimeout(() => {
        if (!win.isDestroyed() && !win.isVisible()) {
            win.center();
            win.show();
            win.focus();
        }
    }, 4000);
    // Don't kill pm3 here — the app window may have already started it
    win.on('closed', () => {});
    return win;
}

function createAppWindow(connectWin) {
    const bounds = connectWin ? connectWin.getBounds() : {};
    const win = new BrowserWindow({
        width: 1400, height: 860,
        minWidth: 1100, minHeight: 700,
        x: bounds.x, y: bounds.y,
        frame: false,
        backgroundColor: '#0a0a0f',
        webPreferences: makePrefs(),
        show: false,
    });

    win.loadFile(path.join(__dirname, 'renderer', 'app.html'));

    win.once('ready-to-show', () => {
        if (connectWin && !connectWin.isDestroyed()) connectWin.close();
        win.center();
        win.show();
        win.focus();

        // Notify dashboard pm3 is running, then replay buffered output
        const pid = pm3Pty?.pid ?? pm3Process?.pid ?? null;
        win.webContents.send('pm3:ready', { pid, port: win._pm3Port || '' });
        setTimeout(() => {
            for (const chunk of outputBuffer) {
                if (!win.isDestroyed()) win.webContents.send('pm3:output', chunk);
            }
        }, 200);
    });

    win.on('closed', () => killPm3());
    return win;
}

// ─── COM Port Scanning ─────────────────────────────────────────────────────────

async function scanComPorts() {
    try {
        const { SerialPort } = require('serialport');
        const ports = await SerialPort.list();
        return ports.map(p => ({
            path: p.path,
            manufacturer: p.manufacturer || '',
            friendlyName: p.friendlyName || p.path,
            vendorId: p.vendorId || '',
            productId: p.productId || '',
        }));
    } catch (e) {
        return [];
    }
}

// ─── PM3 Process Management ────────────────────────────────────────────────────

function killPm3() {
    if (pm3Pty) {
        try { pm3Pty.kill(); } catch (_) {}
        pm3Pty = null;
    }
    if (pm3Process) {
        try { pm3Process.kill(); } catch (_) {}
        pm3Process = null;
    }
}

/**
 * Build the environment block needed by proxmark3.exe.
 * proxmark3.exe is an MSYS2 binary - bash.exe and msys DLLs must be on PATH.
 */
function buildPm3Env(pm3Dir) {
    const libsDir  = path.join(pm3Dir, 'libs');
    const shellDir = path.join(libsDir, 'shell');
    return {
        ...process.env,
        PATH: [pm3Dir, shellDir, libsDir, process.env.PATH || ''].join(path.delimiter),
        HOME: pm3Dir.replace(/\\/g, '/'),
        QT_PLUGIN_PATH: libsDir + path.sep,
        QT_QPA_PLATFORM_PLUGIN_PATH: libsDir + path.sep,
        MSYSTEM: 'MINGW64',
        TERM: 'dumb',
    };
}

// Persistent session state (no long-running process)
let pm3SessionPath = null;
let pm3SessionPort = null;
let pm3SessionEnv  = null;
let pm3SessionDir  = null;

async function spawnPm3(pm3Path, comPort) {
    killPm3();
    outputBuffer.length = 0;

    const pm3Dir = path.dirname(path.resolve(pm3Path));
    const env    = buildPm3Env(pm3Dir);
    const shellDir = path.join(pm3Dir, 'libs', 'shell');
    const bashExe  = path.join(shellDir, 'bash.exe');

    // Store session info for later sendToPm3 calls
    pm3SessionPath = pm3Path;
    pm3SessionPort = comPort;
    pm3SessionEnv  = env;
    pm3SessionDir  = pm3Dir;

    // Dynamically update preferences.json to prevent dump saving issues if folder was moved
    const prefFile = path.join(pm3Dir, '.proxmark3', 'preferences.json');
    if (fs.existsSync(prefFile)) {
        try {
            const prefs = JSON.parse(fs.readFileSync(prefFile, 'utf8'));
            const newPath = pm3Dir + path.sep; // Use standard path sep
            let changed = false;
            ['file.default.savepath', 'file.default.dumppath', 'file.default.tracepath'].forEach(key => {
                if (prefs[key] && prefs[key] !== newPath) {
                    prefs[key] = newPath;
                    changed = true;
                }
            });
            if (changed) {
                fs.writeFileSync(prefFile, JSON.stringify(prefs, null, 2), 'utf8');
                console.log('Aggiornati i percorsi in preferences.json per adattarsi alla directory corrente.');
            }
        } catch (e) {
            console.error('Errore durante l\'aggiornamento di preferences.json:', e);
        }
    }

    // Test connectivity with a quick version check
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
        let output = '';
        let timedOut = false;

        // Run: proxmark3.exe -p COM3 -c 'hw version' --flush
        const test = spawn(pm3Path, ['-p', comPort, '-c', 'hw version', '--flush'], {
            cwd: pm3Dir,
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        test.stdout.on('data', d => {
            output += d.toString();
            const text = d.toString();
            broadcast('pm3:output', text);
        });
        test.stderr.on('data', d => {
            broadcast('pm3:output', d.toString());
        });
        test.on('error', err => {
            resolve({ success: false, error: err.message });
        });
        test.on('exit', (code) => {
            if (timedOut) return;
            // Exit 0 or any output = connected
            const connected = (code === 0) || output.length > 10;
            resolve({
                success: connected,
                pid: test.pid,
                fallback: true,
                error: connected ? null : `proxmark3.exe uscito con codice ${code}`,
            });
        });

        // 8 second timeout for hardware detection
        setTimeout(() => {
            timedOut = true;
            try { test.kill(); } catch (_) {}
            // If we got ANY output, assume connected
            resolve({ success: output.length > 5, pid: 0, fallback: true });
        }, 8000);
    });
}

function sendToPm3(cmd) {
    if (!pm3SessionPath || !pm3SessionPort) return false;

    const { spawn } = require('child_process');
    const proc = spawn(pm3SessionPath, ['-p', pm3SessionPort, '-c', cmd, '--flush'], {
        cwd: pm3SessionDir,
        env: pm3SessionEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.stdout.on('data', d => broadcast('pm3:output', d.toString()));
    proc.stderr.on('data', d => broadcast('pm3:output', d.toString()));
    proc.on('error', err => broadcast('pm3:output', `[!] Errore: ${err.message}\n`));
    proc.on('exit', code => {
        if (code !== 0 && code !== null) {
            broadcast('pm3:output', `[!] Uscito con codice ${code}\n`);
        }
        broadcast('pm3:cmd-done', { code });
    });
    return true;
}

// ─── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('ports:scan', async () => scanComPorts());

// Atomic: spawn pm3 AND open dashboard in one call
ipcMain.handle('pm3:connect', async (event, { pm3Path, comPort }) => {
    outputBuffer.length = 0; // clear stale output from previous session
    const result = await spawnPm3(pm3Path, comPort);
    if (result.success) {
        const connectWin = BrowserWindow.fromWebContents(event.sender);
        const appWin = createAppWindow(connectWin);
        appWin._pm3Port = comPort; // store for pm3:ready notification
    }
    return result;
});

ipcMain.handle('pm3:disconnect', async () => { killPm3(); return { success: true }; });
ipcMain.handle('pm3:send',       async (_, { cmd }) => ({ success: sendToPm3(cmd) }));
ipcMain.handle('pm3:status',     async () => ({
    running: !!(pm3Pty || pm3Process || pm3SessionPath),
    pid: pm3Pty?.pid ?? pm3Process?.pid ?? null,
}));


function killPm3() {
    if (pm3Process) { try { pm3Process.kill(); } catch (_) {} pm3Process = null; }
    if (pm3Pty)     { try { pm3Pty.kill();     } catch (_) {} pm3Pty = null; }
    pm3SessionPath = null;
    pm3SessionPort = null;
    pm3SessionEnv  = null;
    pm3SessionDir  = null;
}
ipcMain.handle('pm3:resize',     async (_, { cols, rows }) => {
    if (pm3Pty) try { pm3Pty.resize(cols, rows); } catch (_) {}
    return { success: true };
});

// Kept for backward compat — pm3:connect now opens dashboard directly
ipcMain.handle('app:openDashboard', async () => ({ success: true }));

ipcMain.handle('app:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
});
ipcMain.handle('app:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
});
ipcMain.handle('app:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
});
ipcMain.handle('app:reconnect', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    createConnectWindow();
    if (win && !win.isDestroyed()) win.close();
});
ipcMain.handle('app:showItemInFolder', (event, { path }) => {
    shell.showItemInFolder(path);
});

ipcMain.handle('dialog:openFile', async (event, { filters }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (event, { filters, defaultPath: dp }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const result = await dialog.showSaveDialog(win, {
        defaultPath: dp,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePath;
});

ipcMain.handle('pm3:defaultPath', async () => {
    const fs = require('fs');
    // Se l'app è pacchettizzata usa process.resourcesPath, altrimenti __dirname
    const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
    const candidates = [
        path.join(baseDir, 'bin', 'ProxLatest', 'client', 'proxmark3.exe'),
        path.join(baseDir, '..', 'ProxLatest', 'client', 'proxmark3.exe'),
        'C:\\ProxSpace\\pm3\\client\\proxmark3.exe',
        'C:\\ProxSpace\\pm3\\client\\pm3.exe',
        path.join(os.homedir(), 'proxmark3', 'client', 'proxmark3.exe'),
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return path.join(baseDir, 'bin', 'ProxLatest', 'client', 'proxmark3.exe');
});

// ─── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(createConnectWindow);

app.on('window-all-closed', () => {
    killPm3();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createConnectWindow();
});

app.on('before-quit', killPm3);
