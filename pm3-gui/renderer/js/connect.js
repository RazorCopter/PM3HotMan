// PM3 HotMan — Connect Screen Logic
'use strict';

const api = window.pm3api;

// ─── State ────────────────────────────────────────────────────────────────
let selectedPort = '';
let scanInterval = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────
const elPath    = document.getElementById('pm3-path');
const elPathHint = document.getElementById('pm3-path-hint');
const elPort    = document.getElementById('com-port');
const elPortList = document.getElementById('port-list');
const elStatus  = document.getElementById('connect-status');
const elConnect = document.getElementById('btn-connect');
const elBrowse  = document.getElementById('btn-browse');
const elScan    = document.getElementById('btn-scan-ports');

// ─── Window controls ──────────────────────────────────────────────────────
document.getElementById('btn-minimize').addEventListener('click', () => api.minimize());
document.getElementById('btn-close').addEventListener('click', () => api.close());

// ─── Helpers ──────────────────────────────────────────────────────────────
function setStatus(msg, type = 'info') {
    elStatus.textContent = '';
    elStatus.className = `connect-status ${type} visible`;

    // Prepend icon
    const icons = { info: 'ℹ', success: '✓', error: '✕', warning: '⚠' };
    const span = document.createElement('span');
    span.textContent = icons[type] || 'ℹ';
    span.style.fontWeight = '700';
    const txt = document.createElement('span');
    txt.textContent = msg;
    elStatus.appendChild(span);
    elStatus.appendChild(txt);
}

function clearStatus() {
    elStatus.className = 'connect-status';
    elStatus.innerHTML = '';
}

// ─── COM Ports ────────────────────────────────────────────────────────────
async function scanPorts() {
    elScan.classList.add('spinning');
    try {
        const ports = await api.scanPorts();
        renderPorts(ports);
    } catch (e) {
        console.error('Scan error', e);
    } finally {
        elScan.classList.remove('spinning');
    }
}

function renderPorts(ports) {
    // Update <select>
    const prev = elPort.value;
    elPort.innerHTML = '';

    if (ports.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = typeof i18n !== 'undefined' ? i18n.t('connect.no_ports') : '— Nessuna porta rilevata —';
        elPort.appendChild(opt);
    } else {
        ports.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.path;
            opt.textContent = `${p.path}${p.manufacturer ? ' — ' + p.manufacturer : ''}`;
            if (p.path === prev || p.path === selectedPort) opt.selected = true;
            elPort.appendChild(opt);
        });
    }

    // Cards under select
    elPortList.innerHTML = '';
    const defaultSerial = typeof i18n !== 'undefined' ? i18n.t('connect.badge_serial') : 'Dispositivo seriale';
    ports.slice(0, 4).forEach((p, i) => {
        const card = document.createElement('div');
        card.className = `port-info-card${p.path === (elPort.value || selectedPort) ? ' selected' : ''}`;
        card.style.animationDelay = `${i * 40}ms`;
        card.innerHTML = `
            <div class="port-icon">🔌</div>
            <div>
                <div class="port-name">${p.path}</div>
                <div class="port-desc">${p.manufacturer || p.friendlyName || defaultSerial}</div>
            </div>
            ${p.vendorId ? `<div class="badge badge-accent ms-auto">${p.vendorId}:${p.productId}</div>` : ''}
        `;
        card.addEventListener('click', () => {
            elPort.value = p.path;
            selectedPort = p.path;
            elPortList.querySelectorAll('.port-info-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
        elPortList.appendChild(card);
    });

    // Auto-select first if nothing chosen
    if (!elPort.value && ports.length > 0) {
        elPort.value = ports[0].path;
        selectedPort = ports[0].path;
    }
}

elPort.addEventListener('change', () => {
    selectedPort = elPort.value;
    elPortList.querySelectorAll('.port-info-card').forEach(c => {
        c.classList.toggle('selected', c.querySelector('.port-name')?.textContent === selectedPort);
    });
});

elScan.addEventListener('click', scanPorts);

// Auto-scan every 3s
scanInterval = setInterval(scanPorts, 3000);
scanPorts(); // immediate

// ─── Browse pm3.exe ───────────────────────────────────────────────────────
elBrowse.addEventListener('click', async () => {
    const p = await api.openFile([{ name: 'PM3 Client', extensions: ['exe'] }, { name: 'All', extensions: ['*'] }]);
    if (p) {
        elPath.value = p;
        validatePath(p);
    }
});

// Load default path
api.defaultPath().then(p => {
    if (p && !elPath.value) {
        elPath.value = p;
        validatePath(p);
    }
});

function validatePath(p) {
    if (!p || p.trim() === '') {
        elPathHint.textContent = '';
        elPathHint.className = 'input-hint';
        return;
    }
    const lower = p.toLowerCase();
    const ok = lower.endsWith('proxmark3.exe') || lower.endsWith('pm3.exe') || lower.includes('proxmark3') || lower.includes('pm3');
    if (ok) {
        elPathHint.textContent = typeof i18n !== 'undefined' ? i18n.t('connect.path_ok') : '✓ Eseguibile Proxmark3 riconosciuto';
        elPathHint.className = 'input-hint ok';
    } else {
        elPathHint.textContent = typeof i18n !== 'undefined' ? i18n.t('connect.path_warn') : 'Assicurati che sia proxmark3.exe (o pm3.exe)';
        elPathHint.className = 'input-hint error';
    }
}

elPath.addEventListener('input', () => validatePath(elPath.value));

// ─── Connect ──────────────────────────────────────────────────────────────
document.getElementById('form-connect').addEventListener('submit', async (e) => {
    e.preventDefault();
    await doConnect();
});

async function doConnect() {
    const pm3Path = elPath.value.trim();
    const comPort = elPort.value.trim();

    if (!pm3Path) {
        setStatus(typeof i18n !== 'undefined' ? i18n.t('connect.path_error') : 'Specifica il percorso di proxmark3.exe', 'error');
        elPath.focus();
        return;
    }
    if (!comPort) {
        setStatus(typeof i18n !== 'undefined' ? i18n.t('connect.port_error') : 'Seleziona una porta COM', 'error');
        return;
    }

    // Disable form
    elConnect.disabled = true;
    const connectingLabel = typeof i18n !== 'undefined' ? i18n.t('connect.connecting_btn') : 'Connessione in corso…';
    elConnect.innerHTML = `<div class="spinner"></div> ${connectingLabel}`;
    setStatus(typeof i18n !== 'undefined' ? i18n.t('connect.starting_pm3', { port: comPort }) : `Avvio proxmark3.exe su ${comPort}…`, 'info');

    // Stop auto-scan
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }

    try {
        const result = await api.connect(pm3Path, comPort);
        if (result.success) {
            // Save to sessionStorage for the app window
            sessionStorage.setItem('pm3Path', pm3Path);
            sessionStorage.setItem('comPort', comPort);
            sessionStorage.setItem('pm3Pid', result.pid);
            sessionStorage.setItem('pm3Fallback', result.fallback ? '1' : '0');

            setStatus(typeof i18n !== 'undefined' ? i18n.t('connect.connected_msg', { pid: result.pid }) : `Connesso! (PID ${result.pid}) Apertura dashboard…`, 'success');

            // Short delay for visual feedback
            await delay(700);
            await api.openDashboard();
        } else {
            throw new Error(result.error || 'Errore sconosciuto');
        }
    } catch (err) {
        setStatus(`Errore: ${err.message}`, 'error');
        elConnect.disabled = false;
        const btnText = typeof i18n !== 'undefined' ? i18n.t('connect.connect_btn') : 'Connetti al Proxmark3';
        elConnect.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.364 5.636 16.95 7.05A7 7 0 1 0 19 12h-2"/><path d="m22 2-7 7"/></svg> ${btnText}`;
        // Restart auto-scan
        scanInterval = setInterval(scanPorts, 3000);
    }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

if (typeof i18n !== 'undefined') {
    i18n.onLanguageChange(() => {
        validatePath(elPath.value);
        scanPorts();
    });
}
