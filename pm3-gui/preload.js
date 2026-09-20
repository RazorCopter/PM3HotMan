// PM3 HotMan GUI — Preload Script (Context Bridge)
// Safely exposes IPC APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pm3api', {
    // ── Window controls ──────────────────────────────────────
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close:    () => ipcRenderer.invoke('app:close'),
    openDashboard: () => ipcRenderer.invoke('app:openDashboard'),
    reconnect: () => ipcRenderer.invoke('app:reconnect'),
    showItemInFolder: (path) => ipcRenderer.invoke('app:showItemInFolder', { path }),

    // ── COM Ports ─────────────────────────────────────────────
    scanPorts: () => ipcRenderer.invoke('ports:scan'),

    // ── PM3 Process ──────────────────────────────────────────
    connect:      (pm3Path, comPort) => ipcRenderer.invoke('pm3:connect', { pm3Path, comPort }),
    disconnect:   () => ipcRenderer.invoke('pm3:disconnect'),
    send:         (cmd) => ipcRenderer.invoke('pm3:send', { cmd }),
    stop:         () => ipcRenderer.invoke('pm3:stop'),
    resize:       (cols, rows) => ipcRenderer.invoke('pm3:resize', { cols, rows }),
    defaultPath:  () => ipcRenderer.invoke('pm3:defaultPath'),
    getStatus:    () => ipcRenderer.invoke('pm3:status'),
    checkUpdate:  (variant) => ipcRenderer.invoke('pm3:update-check', { variant }),
    startUpdate:  (token) => ipcRenderer.invoke('pm3:update-start', { token }),

    // ── Event listeners ───────────────────────────────────────
    onOutput: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('pm3:output', handler);
        return () => ipcRenderer.removeListener('pm3:output', handler);
    },
    onDisconnected: (callback) => {
        const handler = (_, info) => callback(info);
        ipcRenderer.on('pm3:disconnected', handler);
        return () => ipcRenderer.removeListener('pm3:disconnected', handler);
    },
    onReady: (callback) => {
        const handler = (_, info) => callback(info);
        ipcRenderer.on('pm3:ready', handler);
        return () => ipcRenderer.removeListener('pm3:ready', handler);
    },
    onCmdDone: (callback) => {
        const handler = (_, info) => callback(info);
        ipcRenderer.on('pm3:cmd-done', handler);
        return () => ipcRenderer.removeListener('pm3:cmd-done', handler);
    },
    onUpdateProgress: (callback) => {
        const handler = (_, info) => callback(info);
        ipcRenderer.on('pm3:update-progress', handler);
        return () => ipcRenderer.removeListener('pm3:update-progress', handler);
    },
    onUpdateOutput: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('pm3:update-output', handler);
        return () => ipcRenderer.removeListener('pm3:update-output', handler);
    },

    // ── Dialogs ──────────────────────────────────────────────
    openFile: (filters) => ipcRenderer.invoke('dialog:openFile', { filters }),
    saveFile: (filters, defaultPath) => ipcRenderer.invoke('dialog:saveFile', { filters, defaultPath }),
});
