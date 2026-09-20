// PM3 HotMan GUI — Electron Main Process
// Manages window lifecycle, IPC, COM port scanning, and pm3 process

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const fs = require('fs');
const updater = require('./updater');

// ─── Redirect userData to a clean writable path ─────────────────────────────────
app.setPath('userData', path.join(os.tmpdir(), 'pm3-hotman-data'));


let pm3Process = null;
let pm3Pty    = null;
let isDev     = process.argv.includes('--dev');
const engineRoot = path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'PM3HotMan', 'engines');
let updateState = 'idle';
let updateProcess = null;
let lastUpdateCheck = null;
let updateCloseNoticeOpen = false;

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

    win.on('close', event => {
        if (!isFirmwareWriteActive()) return;
        event.preventDefault();
        if (updateCloseNoticeOpen) return;
        updateCloseNoticeOpen = true;
        dialog.showMessageBox(win, {
            type: 'warning',
            title: 'Aggiornamento firmware in corso',
            message: 'Non chiudere PM3 HotMan durante il flash.',
            detail: 'Attendi la verifica finale: interrompere ora può lasciare il Proxmark3 in modalità recovery.',
            buttons: ['Continua aggiornamento'],
            defaultId: 0,
            noLink: true,
        }).finally(() => { updateCloseNoticeOpen = false; });
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

/**
 * Build the environment block needed by proxmark3.exe.
 * proxmark3.exe is an MSYS2 binary - bash.exe and msys DLLs must be on PATH.
 */
function buildPm3Env(pm3Dir) {
    const libsDir  = path.join(pm3Dir, 'libs');
    const shellDir = path.join(libsDir, 'shell');
    // Usa la cartella userData dell'app Electron come HOME in modo che Proxmark3
    // possa scrivere i file di log e configurazione senza errori di permessi.
    const userHome = app.getPath('userData');
    return {
        ...process.env,
        PATH: [pm3Dir, shellDir, libsDir, process.env.PATH || ''].join(path.delimiter),
        HOME: userHome.replace(/\\/g, '/'),
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
let activeCommandProcess = null;
let activeCommandStopped = false;

function isFirmwareWriteActive() {
    return updateState === 'flashing' || updateState === 'verifying';
}

function setUpdateState(phase, detail = {}) {
    updateState = phase;
    broadcast('pm3:update-progress', { phase, ...detail });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function runPm3Capture(pm3Path, comPort, cmd, options = {}) {
    const { spawn } = require('child_process');
    const pm3Dir = path.dirname(path.resolve(pm3Path));
    const env = options.env || buildPm3Env(pm3Dir);
    const docsPath = path.join(app.getPath('documents'), 'PM3_Dumps');
    if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

    return new Promise((resolve, reject) => {
        let output = '';
        let settled = false;
        const proc = spawn(pm3Path, ['-p', comPort, '-c', cmd, '--flush'], {
            cwd: docsPath,
            env,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        if (options.trackCommand) {
            activeCommandProcess = proc;
            activeCommandStopped = false;
        }

        const consume = chunk => {
            const text = chunk.toString();
            output += text;
            if (options.broadcastOutput) broadcast('pm3:output', text);
        };
        proc.stdout.on('data', consume);
        proc.stderr.on('data', consume);
        proc.on('error', error => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (options.trackCommand && activeCommandProcess === proc) activeCommandProcess = null;
            reject(error);
        });
        proc.on('exit', code => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            const stopped = options.trackCommand && activeCommandStopped;
            if (options.trackCommand && activeCommandProcess === proc) activeCommandProcess = null;
            if (options.trackCommand) {
                activeCommandStopped = false;
                broadcast('pm3:cmd-done', { code, stopped });
            }
            resolve({ code, output, stopped });
        });

        const timer = setTimeout(async () => {
            if (settled) return;
            settled = true;
            if (options.trackCommand && activeCommandProcess === proc) activeCommandProcess = null;
            await killProcessTree(proc);
            reject(new Error(`Timeout durante "${cmd}".`));
        }, options.timeoutMs || 20000);
    });
}

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
    // Ora salva i dump nella cartella documenti dell'utente
    const userHome = app.getPath('userData');
    const proxmarkUserDir = path.join(userHome, '.proxmark3');
    if (!fs.existsSync(proxmarkUserDir)) {
        fs.mkdirSync(proxmarkUserDir, { recursive: true });
    }
    const prefFile = path.join(proxmarkUserDir, 'preferences.json');
    const defaultPrefFile = path.join(pm3Dir, '.proxmark3', 'preferences.json');
    
    // Copia i pref di default se non esistono
    if (!fs.existsSync(prefFile) && fs.existsSync(defaultPrefFile)) {
        try { fs.copyFileSync(defaultPrefFile, prefFile); } catch (e) { console.error('Errore copia preferences.json', e); }
    }

    if (fs.existsSync(prefFile)) {
        try {
            const prefs = JSON.parse(fs.readFileSync(prefFile, 'utf8'));
            const docsPath = path.join(app.getPath('documents'), 'PM3_Dumps') + path.sep; 
            if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

            let changed = false;
            ['file.default.savepath', 'file.default.dumppath', 'file.default.tracepath'].forEach(key => {
                if (prefs[key] !== docsPath) {
                    prefs[key] = docsPath;
                    changed = true;
                }
            });
            if (changed) {
                fs.writeFileSync(prefFile, JSON.stringify(prefs, null, 2), 'utf8');
                console.log('Aggiornati i percorsi in preferences.json per usare la cartella Documenti.');
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
        const docsPath = path.join(app.getPath('documents'), 'PM3_Dumps');
        const test = spawn(pm3Path, ['-p', comPort, '-c', 'hw version', '--flush'], {
            cwd: docsPath,
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
    if (!pm3SessionPath || !pm3SessionPort || activeCommandProcess) return false;

    const { spawn } = require('child_process');
    const docsPath = require('path').join(require('electron').app.getPath('documents'), 'PM3_Dumps');
    const proc = spawn(pm3SessionPath, ['-p', pm3SessionPort, '-c', cmd, '--flush'], {
        cwd: docsPath,
        env: pm3SessionEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    activeCommandProcess = proc;
    activeCommandStopped = false;
    proc.stdout.on('data', d => broadcast('pm3:output', d.toString()));
    proc.stderr.on('data', d => broadcast('pm3:output', d.toString()));
    proc.on('error', err => {
        if (activeCommandProcess === proc) activeCommandProcess = null;
        broadcast('pm3:output', `[!] Errore: ${err.message}\n`);
        broadcast('pm3:cmd-done', { code: null, stopped: false });
    });
    proc.on('exit', code => {
        const stopped = activeCommandStopped;
        if (activeCommandProcess === proc) activeCommandProcess = null;
        activeCommandStopped = false;
        if (!stopped && code !== 0 && code !== null) {
            broadcast('pm3:output', `[!] Uscito con codice ${code}\n`);
        }
        broadcast('pm3:cmd-done', { code, stopped });
    });
    return true;
}

function killProcessTree(proc) {
    return new Promise(resolve => {
        if (!proc || !proc.pid) return resolve(false);
        if (process.platform !== 'win32') {
            try { process.kill(-proc.pid, 'SIGTERM'); } catch (_) {
                try { proc.kill('SIGTERM'); } catch (_) {}
            }
            return resolve(true);
        }

        const { execFile } = require('child_process');
        execFile('taskkill.exe', ['/PID', String(proc.pid), '/T', '/F'], { windowsHide: true }, error => {
            if (error) {
                try { proc.kill(); } catch (_) {}
            }
            resolve(true);
        });
    });
}

async function stopActiveCommand() {
    if (isFirmwareWriteActive()) {
        return {
            success: false,
            error: 'Il flash non può essere interrotto: attendi la verifica finale del firmware.',
            protected: true,
        };
    }
    const proc = activeCommandProcess;
    if (!proc) return { success: false, error: 'Nessun comando in esecuzione.' };

    activeCommandStopped = true;
    broadcast('pm3:output', '\n[!] Interruzione richiesta dall\'utente...\n');
    await killProcessTree(proc);
    return { success: true };
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
ipcMain.handle('pm3:stop',       async () => stopActiveCommand());
ipcMain.handle('pm3:status',     async () => ({
    running: !!(pm3Pty || pm3Process || pm3SessionPath),
    pid: pm3Pty?.pid ?? pm3Process?.pid ?? null,
    commandRunning: !!activeCommandProcess,
    updateState,
}));

function publicUpdateCheck(check) {
    const { _packageEndpoint, ...safe } = check;
    return safe;
}

ipcMain.handle('pm3:update-check', async (_, { variant } = {}) => {
    if (!pm3SessionPath || !pm3SessionPort) {
        return { success: false, error: 'Collega prima il Proxmark3.' };
    }
    if (activeCommandProcess || updateState !== 'idle') {
        return { success: false, error: 'Attendi la conclusione del comando in esecuzione.' };
    }

    try {
        setUpdateState('checking-device', { message: 'Lettura firmware e hardware…' });
        const captured = await runPm3Capture(pm3SessionPath, pm3SessionPort, 'hw version', {
            timeoutMs: 25000,
            broadcastOutput: true,
            trackCommand: true,
        });
        if (captured.stopped) {
            setUpdateState('idle');
            return { success: false, error: 'Controllo aggiornamenti interrotto.' };
        }
        if (!captured.output.trim()) throw new Error('Il Proxmark3 non ha restituito informazioni sulla versione.');

        setUpdateState('checking-online', { message: 'Controllo release RRG e pacchetto Windows…' });
        const check = await updater.checkForUpdate({
            deviceOutput: captured.output,
            clientPath: pm3SessionPath,
            variantOverride: variant || null,
        });
        const token = crypto.randomUUID();
        lastUpdateCheck = { token, check, createdAt: Date.now() };
        setUpdateState('idle', { message: 'Controllo completato.' });
        return { success: true, token, check: publicUpdateCheck(check) };
    } catch (error) {
        lastUpdateCheck = null;
        setUpdateState('idle');
        return { success: false, error: error.message };
    }
});

ipcMain.handle('pm3:update-start', async (_, { token } = {}) => {
    const cached = lastUpdateCheck;
    if (!cached || token !== cached.token || Date.now() - cached.createdAt > 15 * 60 * 1000) {
        return { success: false, error: 'Controllo aggiornamenti scaduto: eseguilo nuovamente.' };
    }
    if (!cached.check.packageUpdateAvailable || cached.check.blockedReason) {
        return { success: false, error: cached.check.blockedReason || 'Nessun pacchetto più recente disponibile.' };
    }
    if (activeCommandProcess || updateState !== 'idle') {
        return { success: false, error: 'Un altro comando è ancora in esecuzione.' };
    }
    if (!pm3SessionPort) return { success: false, error: 'Il Proxmark3 non è più collegato.' };

    const connectedPorts = await scanComPorts();
    const flashablePorts = connectedPorts.filter(port => {
        const vid = String(port.vendorId || '').toUpperCase();
        const pid = String(port.productId || '').toUpperCase();
        return (vid === '9AC4' && pid === '4B8F') || (vid === '2D2D' && pid === '504D');
    });
    if (flashablePorts.length > 1) {
        return {
            success: false,
            error: 'Sono collegati più Proxmark3: lascia connesso soltanto il dispositivo da aggiornare.',
        };
    }

    let prepared = null;
    try {
        setUpdateState('download', { message: 'Download del pacchetto Windows…', percent: 0 });
        prepared = await updater.preparePackage({
            engineRoot,
            packageInfo: cached.check.package,
            endpoint: cached.check._packageEndpoint,
            onProgress: progress => setUpdateState(progress.phase, progress),
        });

        const stagedClientDir = path.dirname(prepared.clientPath);
        const stagedEnv = buildPm3Env(stagedClientDir);
        setUpdateState('flashing', {
            message: 'Scrittura bootloader e firmware. Non scollegare il dispositivo.',
            protected: true,
        });
        const flashResult = await updater.flashPackage({
            packageRoot: prepared.packageRoot,
            port: pm3SessionPort,
            env: stagedEnv,
            killTree: killProcessTree,
            onProcess: proc => { updateProcess = proc; },
            onPhase: message => setUpdateState('flashing', { message, protected: true }),
            onOutput: text => broadcast('pm3:update-output', text),
        });
        updateProcess = null;

        setUpdateState('verifying', {
            message: 'Verifica del firmware appena installato…',
            protected: true,
        });
        let verification = null;
        let lastError = null;
        for (let attempt = 1; attempt <= 6; attempt += 1) {
            try {
                verification = await runPm3Capture(prepared.clientPath, pm3SessionPort, 'hw version', {
                    timeoutMs: 20000,
                    env: stagedEnv,
                });
                if (verification.output.trim()) break;
            } catch (error) {
                lastError = error;
            }
            await wait(2000);
        }
        if (!verification?.output.trim()) throw lastError || new Error('Verifica finale del dispositivo non riuscita.');
        const verifiedDevice = updater.inspectDeviceOutput(verification.output);
        const commitPrefix = cached.check.package.commit.slice(0, 9);
        const verifiedText = `${verifiedDevice.firmware || ''} ${verifiedDevice.bootloader || ''} ${verification.output}`.toLowerCase();
        if (!verifiedText.includes(commitPrefix)) {
            throw new Error(`Il dispositivo risponde, ma non espone il commit atteso ${commitPrefix}.`);
        }

        const activated = updater.activatePackage({
            engineRoot,
            prepared,
            packageInfo: cached.check.package,
        });
        prepared = null;
        pm3SessionPath = activated.clientPath;
        pm3SessionDir = path.dirname(activated.clientPath);
        pm3SessionEnv = buildPm3Env(pm3SessionDir);
        lastUpdateCheck = null;
        setUpdateState('complete', {
            message: `Aggiornamento completato: ${activated.manifest.version}`,
            version: activated.manifest.version,
        });
        setTimeout(() => {
            if (updateState === 'complete') setUpdateState('idle');
        }, 5000);
        return {
            success: true,
            version: activated.manifest.version,
            firmware: verifiedDevice.firmware,
            bootloader: verifiedDevice.bootloader,
            flashMode: flashResult.mode,
            sha256: activated.manifest.sha256,
        };
    } catch (error) {
        updateProcess = null;
        const recoveryPath = prepared?.packageRoot || null;
        setUpdateState('failed', {
            message: error.message,
            recoveryPath,
        });
        setTimeout(() => {
            if (updateState === 'failed') setUpdateState('idle');
        }, 5000);
        return { success: false, error: error.message, recoveryPath };
    }
});


function killPm3() {
    if (updateProcess) {
        killProcessTree(updateProcess);
        updateProcess = null;
    }
    if (activeCommandProcess) {
        activeCommandStopped = true;
        killProcessTree(activeCommandProcess);
        activeCommandProcess = null;
    }
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
    const activeClient = updater.getActiveClientPath(engineRoot);
    if (activeClient) return activeClient;
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

app.on('before-quit', event => {
    if (isFirmwareWriteActive()) {
        event.preventDefault();
        broadcast('pm3:update-progress', {
            phase: updateState,
            message: 'Chiusura bloccata: attendi la fine del flash.',
            protected: true,
        });
        return;
    }
    killPm3();
});
