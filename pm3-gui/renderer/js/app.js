// PM3 HotMan — App Main Logic
// Navigation, command execution, output rendering
'use strict';

const api = window.pm3api;

// ─── State ────────────────────────────────────────────────────────────────
let currentView   = 'home';
let currentCmd    = null;
let recentCmds    = JSON.parse(localStorage.getItem('pm3_recent') || '[]');
let isRunning     = false;
let rawCollapsed  = false;
let outputParser  = new SessionParser();
const commandCardsCache = {}; // Cache cards per command ID

// ─── DOM refs ─────────────────────────────────────────────────────────────
const elViewCommands  = document.getElementById('view-commands');
const elViewDetail    = document.getElementById('view-detail');
const elViewSearch    = document.getElementById('view-search');
const elCommandsGrid  = document.getElementById('commands-grid');
const elSearchGrid    = document.getElementById('search-grid');
const elParamForm     = document.getElementById('param-form');
const elDetailIcon    = document.getElementById('detail-icon');
const elDetailTitle   = document.getElementById('detail-title');
const elDetailDesc    = document.getElementById('detail-desc');
const elDetailCmd     = document.getElementById('detail-cmd-preview');
const elOutputResults = document.getElementById('output-results');
const elOutputRaw     = document.getElementById('output-raw');
const elOutputRunning = document.getElementById('output-running');
const elOutputIndicator = document.getElementById('output-indicator');
const elOutputTitle   = document.getElementById('output-title');
const elStatusDot     = document.getElementById('status-dot');
const elStatusLabel   = document.getElementById('status-label');
const elStatusPort    = document.getElementById('status-port');
const elGlobalSearch  = document.getElementById('global-search');
const elStopCommand   = document.getElementById('btn-stop-command');
const elTerminalStop  = document.getElementById('btn-terminal-stop');
const elUpdateButton  = document.getElementById('btn-update');

// ─── Window controls ──────────────────────────────────────────────────────
document.getElementById('btn-minimize').addEventListener('click', () => api.minimize());
document.getElementById('btn-maximize').addEventListener('click', () => api.maximize());
document.getElementById('btn-close').addEventListener('click', () => api.close());
let isDisconnected = false;
let currentConnState = 'connecting';
document.getElementById('btn-disconnect').addEventListener('click', async () => {
    const btn = document.getElementById('btn-disconnect');
    if (!isDisconnected) {
        const confirmMsg = typeof i18n !== 'undefined' ? i18n.t('titlebar.disconnect_confirm') : 'Disconnettersi dal Proxmark3?';
        if (confirm(confirmMsg)) {
            await api.disconnect();
            setConnectionStatus('disconnected', typeof i18n !== 'undefined' ? i18n.t('titlebar.disconnected') : 'Disconnesso');
            isDisconnected = true;
            
            // Cambia l'aspetto e la funzione in "Riconnetti"
            btn.title = typeof i18n !== 'undefined' ? i18n.t('titlebar.reconnect') : 'Riconnetti';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.26l5.42 5.42"/></svg>';
        }
    } else {
        // Riconnessione
        await api.reconnect();
    }
});

// ─── Connection status ────────────────────────────────────────────────────
function setConnectionStatus(state, label, port) {
    currentConnState = state;
    elStatusDot.className = `status-dot ${state}`;
    elStatusLabel.textContent = label;
    if (port) elStatusPort.textContent = port;
}

function refreshConnectionStatusText() {
    if (currentConnState === 'connecting') {
        elStatusLabel.textContent = typeof i18n !== 'undefined' ? i18n.t('titlebar.waiting_pm3') : 'In attesa pm3…';
    } else if (currentConnState === 'connected') {
        elStatusLabel.textContent = typeof i18n !== 'undefined' ? i18n.t('titlebar.connected') : 'Connesso';
    } else if (currentConnState === 'disconnected') {
        elStatusLabel.textContent = typeof i18n !== 'undefined' ? i18n.t('titlebar.disconnected') : 'Disconnesso';
    }
    const btn = document.getElementById('btn-disconnect');
    if (btn) {
        btn.title = isDisconnected
            ? (typeof i18n !== 'undefined' ? i18n.t('titlebar.reconnect') : 'Riconnetti')
            : (typeof i18n !== 'undefined' ? i18n.t('titlebar.disconnect') : 'Disconnetti');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const port = sessionStorage.getItem('comPort') || '';
    if (port) elStatusPort.textContent = port;
    const waitLabel = typeof i18n !== 'undefined' ? i18n.t('titlebar.waiting_pm3') : 'In attesa pm3…';
    setConnectionStatus('connecting', waitLabel, port);

    // Listen for the "ready" signal from main process (proxmark3 already running)
    api.onReady(({ pid, port: p }) => {
        const displayPort = p || port || elStatusPort.textContent;
        const connLabel = typeof i18n !== 'undefined' ? i18n.t('titlebar.connected') : 'Connesso';
        setConnectionStatus('connected', connLabel, displayPort);
        showToast(`proxmark3.exe avviato (PID ${pid})`, 'success', 3000);
    });

    api.onCmdDone(({ code, stopped }) => {
        if (isRunning) {
            setRunning(false);
            
            // Forziamo il parsing dell'ultima riga rimasta nel buffer 
            // (dato che proxmark3 non stampa un a capo finale)
            if (typeof outputParser.flush === 'function') {
                const flushResult = outputParser.flush();
                // Assicuriamoci di appendere l'ultima riga raw se presente
                if (flushResult.newLines && flushResult.newLines.length > 0) {
                    for (const line of flushResult.newLines) {
                        appendRawLine(line.clean, line.cls);
                    }
                }
            }

            if (stopped) {
                const stopMsg = typeof i18n !== 'undefined' ? i18n.t('output.stopped_msg') : "[!] Comando interrotto dall'utente.";
                appendRawLine(stopMsg, 'warning');
                terminal.appendLine(stopMsg, 'warning');
                setOutputStatus('stopped');
                const stopToast = typeof i18n !== 'undefined' ? i18n.t('output.stopped_toast') : 'Comando interrotto.';
                showToast(stopToast, 'warning', 3000);
            } else if (code === 0 || code === null) {
                setOutputStatus('success');
                // Parse the final output and render cards
                renderResultCards(outputParser.cards);
            } else {
                setOutputStatus('error');
            }
        }
    });

    // Fallback: poll pm3:status every second for up to 10s
    let pollCount = 0;
    const pollInterval = setInterval(async () => {
        try {
            const s = await api.getStatus();
            if (s && s.running) {
                setConnectionStatus('connected', 'Connesso', elStatusPort.textContent);
                clearInterval(pollInterval);
            }
        } catch (_) {}
        if (++pollCount > 10) clearInterval(pollInterval);
    }, 1000);
});

// ─── PM3 output handler ───────────────────────────────────────────────────
const removeOutputListener = api.onOutput(handleOutput);
const removeDisconnectListener = api.onDisconnected(({ exitCode }) => {
    const discLabel = typeof i18n !== 'undefined' ? i18n.t('titlebar.disconnected') : 'Disconnesso';
    setConnectionStatus('disconnected', `${discLabel} (exit ${exitCode})`);
    setRunning(false);
    showToast(typeof i18n !== 'undefined' ? i18n.t('output.process_closed') : 'Il processo pm3 si è chiuso.', 'warning');
});

function handleOutput(chunk) {
    // Parse
    const result = outputParser.feed(chunk);

    // Append raw lines to output panel
    for (const line of result.newLines) {
        appendRawLine(line.clean, line.cls);
    }
    // Also feed terminal overlay
    terminal.appendRaw(chunk);

    // Update structured cards
    if (result.cards.length > 0) {
        if (currentCmd) {
            commandCardsCache[currentCmd.id] = result.cards;
        }
        renderResultCards(result.cards);
    }

    // Auto-stop running state if pm3 prompt detected
    if (chunk.includes('[usb]') || chunk.includes('pm3 >') || chunk.includes('pm3>')) {
        setRunning(false);
    }
}

// ─── Running state ────────────────────────────────────────────────────────
function setRunning(state) {
    isRunning = state;
    elOutputRunning.classList.toggle('hidden', !state);
    elOutputIndicator.className = `output-indicator ${state ? 'running' : ''}`;
    document.getElementById('btn-run').disabled = state;
    elStopCommand.disabled = !state;
    elStopCommand.classList.remove('stopping');
    elStopCommand.querySelector('span').textContent = typeof i18n !== 'undefined' ? i18n.t('output.stop') : 'Interrompi';
    elTerminalStop.disabled = !state;
    elTerminalStop.classList.toggle('hidden', !state);
    elTerminalStop.classList.remove('stopping');
    elTerminalStop.querySelector('span').textContent = typeof i18n !== 'undefined' ? i18n.t('terminal.stop') : 'Stop';
    elUpdateButton.disabled = state || !!window.pm3UpdaterUI?.isBusy();
}

// ─── Output rendering ─────────────────────────────────────────────────────
function appendRawLine(text, cls) {
    const div = document.createElement('div');
    div.className = `out-line ${cls}`;
    div.textContent = text;
    elOutputRaw.appendChild(div);
    elOutputRaw.scrollTop = elOutputRaw.scrollHeight;
}

function renderResultCards(cards) {
    elOutputResults.innerHTML = '';
    for (const c of cards) {
        elOutputResults.appendChild(renderResultCard(c));
    }
}

function clearOutput() {
    elOutputRaw.innerHTML = '';
    elOutputResults.innerHTML = '';
    elOutputIndicator.className = 'output-indicator';
    elOutputTitle.textContent = 'Output';
    outputParser.reset();
}

document.getElementById('btn-clear-output').addEventListener('click', clearOutput);

// (Toggle raw rimosso, ora occupa l'intera colonna)

const elBtnCopyOutput = document.getElementById('btn-copy-output');
if (elBtnCopyOutput) {
    elBtnCopyOutput.addEventListener('click', () => {
        const text = elOutputRaw.innerText || elOutputRaw.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalTitle = elBtnCopyOutput.title;
            elBtnCopyOutput.title = 'Copiato!';
            const svg = elBtnCopyOutput.innerHTML;
            elBtnCopyOutput.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => {
                elBtnCopyOutput.title = originalTitle;
                elBtnCopyOutput.innerHTML = svg;
            }, 2000);
        });
    });
}


// ─── Navigation ───────────────────────────────────────────────────────────
function showView(name) {
    elViewCommands.classList.add('hidden');
    elViewDetail.classList.add('hidden');
    elViewSearch.classList.add('hidden');

    if (name === 'detail') {
        elViewDetail.classList.remove('hidden');
    } else if (name === 'search') {
        elViewSearch.classList.remove('hidden');
    } else {
        elViewCommands.classList.remove('hidden');
    }
}

function navigateTo(view) {
    currentView = view;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
    });

    if (view === 'home')   renderHome();
    else if (view === 'recent') renderRecent();
    else {
        const [cat, sub] = view.split('/');
        renderCategoryView(cat, sub);
    }
    showView('commands');
}

document.querySelectorAll('.sidebar-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.view));
});

// ─── Home view ────────────────────────────────────────────────────────────
function renderHome() {
    const homeTitle = typeof i18n !== 'undefined' ? i18n.t('home.title') : 'Dashboard';
    const homeDesc = typeof i18n !== 'undefined' ? i18n.t('home.desc') : "Seleziona un'operazione o esplora le categorie nella sidebar.";
    document.getElementById('view-title').textContent = homeTitle;
    document.getElementById('view-desc').textContent = homeDesc;

    elCommandsGrid.innerHTML = '';

    // Hero card
    const hero = document.createElement('div');
    hero.className = 'home-hero';
    hero.style.gridColumn = '1 / -1';
    const port = sessionStorage.getItem('comPort') || '?';
    const heroTitle = typeof i18n !== 'undefined' ? i18n.t('home.hero_title') : 'Proxmark3 connesso';
    const heroDesc = typeof i18n !== 'undefined' ? i18n.t('home.hero_desc') : "Scegli un'operazione dalla lista o dalla sidebar. I comandi \"rapidi\" in verde permettono la rilevazione automatica dei tag.";
    const activePort = typeof i18n !== 'undefined' ? i18n.t('home.active_port') : 'Porta attiva';
    const onlineBadge = typeof i18n !== 'undefined' ? i18n.t('home.online') : 'Online';

    hero.innerHTML = `
        <div style="font-size:2.5rem">📡</div>
        <div class="home-hero-text">
            <h2>${heroTitle}</h2>
            <p>${heroDesc}</p>
        </div>
        <div class="home-conn-info">
            <span class="label">${activePort}</span>
            <span class="value">${port}</span>
            <span class="badge badge-success mt-2">● ${onlineBadge}</span>
        </div>
    `;
    elCommandsGrid.appendChild(hero);

    // Featured section title
    const titleEl = document.createElement('div');
    titleEl.className = 'home-section-title';
    titleEl.textContent = typeof i18n !== 'undefined' ? i18n.t('home.quick_actions') : '⚡ Azioni rapide';
    elCommandsGrid.appendChild(titleEl);

    // Featured commands
    for (const cmd of getFeaturedCommands()) {
        elCommandsGrid.appendChild(renderCmdCard(cmd, openCommandDetail));
    }

    // Recent section
    if (recentCmds.length > 0) {
        const recentTitle = document.createElement('div');
        recentTitle.className = 'home-section-title';
        recentTitle.textContent = typeof i18n !== 'undefined' ? i18n.t('home.recently_used') : '⏱ Usati di recente';
        elCommandsGrid.appendChild(recentTitle);

        for (const id of recentCmds.slice(0, 6)) {
            const cmd = getCommand(id);
            if (cmd) elCommandsGrid.appendChild(renderCmdCard(cmd, openCommandDetail));
        }
    }
}

// ─── Category view ────────────────────────────────────────────────────────
function renderCategoryView(cat, sub) {
    const catInfo = typeof i18n !== 'undefined' ? i18n.getLocalizedCategory(cat, sub) : CATEGORIES[cat];
    const cmds = getCommandsByCategory(cat, sub || undefined);

    document.getElementById('view-title').textContent = (catInfo?.label) || cat.toUpperCase();
    document.getElementById('view-desc').textContent = catInfo?.description || '';

    elCommandsGrid.innerHTML = '';
    for (const cmd of cmds) {
        elCommandsGrid.appendChild(renderCmdCard(cmd, openCommandDetail));
    }
    if (cmds.length === 0) {
        const emptyMsg = typeof i18n !== 'undefined' ? i18n.t('home.no_category_cmds') : 'Nessun comando disponibile in questa categoria.';
        elCommandsGrid.innerHTML = `<div class="no-params-msg" style="grid-column:1/-1">${emptyMsg}</div>`;
    }
}

// ─── Recent view ──────────────────────────────────────────────────────────
function renderRecent() {
    document.getElementById('view-title').textContent = typeof i18n !== 'undefined' ? i18n.t('recent.title') : 'Usati di recente';
    document.getElementById('view-desc').textContent = typeof i18n !== 'undefined' ? i18n.t('recent.desc') : 'Gli ultimi comandi eseguiti.';
    elCommandsGrid.innerHTML = '';
    if (recentCmds.length === 0) {
        const noRecent = typeof i18n !== 'undefined' ? i18n.t('home.no_recent') : 'Nessun comando usato finora.';
        elCommandsGrid.innerHTML = `<div class="no-params-msg" style="grid-column:1/-1">${noRecent}</div>`;
        return;
    }
    for (const id of recentCmds.slice(0, 12)) {
        const cmd = getCommand(id);
        if (cmd) elCommandsGrid.appendChild(renderCmdCard(cmd, openCommandDetail));
    }
}

// ─── Command detail ───────────────────────────────────────────────────────
function openCommandDetail(cmd) {
    currentCmd = cmd;
    const locCmd = typeof i18n !== 'undefined' ? i18n.getLocalizedCommand(cmd) : cmd;

    elDetailIcon.textContent  = locCmd.icon || '⚙';
    elDetailTitle.textContent = locCmd.name;
    elDetailDesc.textContent  = locCmd.description;
    elDetailCmd.textContent   = locCmd.pm3cmd;

    renderParamForm(locCmd, elParamForm);
    updateCmdPreview(locCmd, {});

    // Pulisci o ripristina le card dei risultati per questo comando
    elOutputResults.innerHTML = '';
    if (commandCardsCache[cmd.id]) {
        renderResultCards(commandCardsCache[cmd.id]);
    }

    showView('detail');

    // Add event: update preview on input
    elParamForm.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => {
            const vals = collectFormValues(locCmd);
            updateCmdPreview(locCmd, vals);
        });
    });
}

function updateCmdPreview(cmd, values) {
    let preview = cmd.pm3cmd;
    for (const [k, v] of Object.entries(values)) {
        preview = preview.replace(new RegExp(`\\{${k}\\}`, 'g'), v || `{${k}}`);
    }
    elDetailCmd.textContent = preview;
}

document.getElementById('btn-back').addEventListener('click', () => {
    showView('commands');
});

// ─── Execute command ──────────────────────────────────────────────────────
document.getElementById('btn-run').addEventListener('click', () => {
    if (!currentCmd) return;
    executeCommand(currentCmd);
});

async function stopRunningCommand() {
    if (!isRunning || elStopCommand.disabled) return;

    const stoppingText = typeof i18n !== 'undefined' ? i18n.t('output.stopping') : 'Arresto…';
    const stopText = typeof i18n !== 'undefined' ? i18n.t('output.stop') : 'Interrompi';

    elStopCommand.disabled = true;
    elStopCommand.classList.add('stopping');
    elStopCommand.querySelector('span').textContent = stoppingText;
    elTerminalStop.disabled = true;
    elTerminalStop.classList.add('stopping');
    elTerminalStop.querySelector('span').textContent = stoppingText;
    const result = await api.stop();
    if (!result.success) {
        elStopCommand.disabled = false;
        elStopCommand.classList.remove('stopping');
        elStopCommand.querySelector('span').textContent = stopText;
        elTerminalStop.disabled = false;
        elTerminalStop.classList.remove('stopping');
        elTerminalStop.querySelector('span').textContent = typeof i18n !== 'undefined' ? i18n.t('terminal.stop') : 'Stop';
        showToast(result.error || 'Impossibile interrompere il comando.', 'error');
    }
}

elStopCommand.addEventListener('click', stopRunningCommand);
elTerminalStop.addEventListener('click', stopRunningCommand);
window.addEventListener('pm3-command-started', ({ detail }) => {
    elOutputTitle.textContent = detail.cmd;
    setRunning(true);
    setOutputStatus('running');
});

document.getElementById('btn-copy-cmd').addEventListener('click', () => {
    if (!currentCmd) return;
    const locCmd = typeof i18n !== 'undefined' ? i18n.getLocalizedCommand(currentCmd) : currentCmd;
    const vals = collectFormValues(locCmd);
    const built = buildCommand(locCmd, vals);
    const copiedMsg = typeof i18n !== 'undefined' ? i18n.t('detail.cmd_copied') : 'Comando copiato!';
    navigator.clipboard.writeText(built).then(() => showToast(copiedMsg, 'success', 1500));
});

async function executeCommand(cmd) {
    if (isRunning) {
        showToast(typeof i18n !== 'undefined' ? i18n.t('output.already_running') : 'Un comando è già in esecuzione.', 'warning');
        return;
    }

    const locCmd = typeof i18n !== 'undefined' ? i18n.getLocalizedCommand(cmd) : cmd;
    const values = collectFormValues(locCmd);
    const err = validateFormValues(locCmd, values);
    if (err) { showToast(err, 'error'); return; }

    const finalCmd = buildCommand(locCmd, values);

    // Update recent
    recentCmds = [cmd.id, ...recentCmds.filter(id => id !== cmd.id)].slice(0, 20);
    localStorage.setItem('pm3_recent', JSON.stringify(recentCmds));

    // Clear output, cache and start
    commandCardsCache[cmd.id] = null;
    clearOutput();
    outputParser.reset();
    elOutputTitle.textContent = locCmd.name;
    setRunning(true);
    setOutputStatus('running');

    // Append echo
    appendRawLine(`> ${finalCmd}`, 'info');
    terminal.appendLine(`> ${finalCmd}`, 'info');

    const result = await api.send(finalCmd);
    if (!result.success) {
        appendRawLine(typeof i18n !== 'undefined' ? i18n.t('output.cant_send') : '[!] Impossibile inviare il comando. Il processo pm3 non è in esecuzione.', 'error');
        setRunning(false);
        setOutputStatus('error');
        return;
    }

    // Keep the stop control available for long-running attacks.
    setTimeout(() => {
        if (isRunning) {
            appendRawLine(typeof i18n !== 'undefined' ? i18n.t('output.long_running_warn') : '[=] Comando ancora in esecuzione dopo 10 minuti. Puoi interromperlo con il pulsante Stop.', 'warning');
        }
    }, 600000);
}

function setOutputStatus(state) {
    elOutputIndicator.className = `output-indicator ${state}`;
    if (state === 'running') { /* keep spinner visible */ }
    else if (state === 'stopped') setTimeout(() => { elOutputIndicator.className = 'output-indicator'; }, 5000);
    else if (state === 'success') setTimeout(() => { elOutputIndicator.className = 'output-indicator'; }, 3000);
    else if (state === 'error')   setTimeout(() => { elOutputIndicator.className = 'output-indicator'; }, 5000);
}

// Watch output for completion and update status
const _origFeed = outputParser.feed.bind(outputParser);

// ─── Global search ────────────────────────────────────────────────────────
elGlobalSearch.addEventListener('input', () => {
    const q = elGlobalSearch.value.trim();
    if (!q) {
        elViewSearch.classList.add('hidden');
        navigateTo(currentView);
        return;
    }
    const results = searchCommands(q);
    const isIt = typeof i18n !== 'undefined' ? (i18n.getLang() === 'it') : true;
    const plural = isIt ? (results.length === 1 ? 'o' : 'i') : (results.length === 1 ? '' : 's');
    document.getElementById('search-title').textContent = typeof i18n !== 'undefined'
        ? i18n.t('search.title', { count: results.length, plural, query: q })
        : `${results.length} risultat${plural} per "${q}"`;
    elSearchGrid.innerHTML = '';
    for (const cmd of results) {
        elSearchGrid.appendChild(renderCmdCard(cmd, openCommandDetail));
    }
    showView('search');
});

// Ctrl+K focus search
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        elGlobalSearch.focus();
        elGlobalSearch.select();
    }
});

// ─── Terminal init ────────────────────────────────────────────────────────
terminal.init(outputParser);

// ─── i18n Language Change Hook ────────────────────────────────────────────
if (typeof i18n !== 'undefined') {
    i18n.onLanguageChange(() => {
        refreshConnectionStatusText();
        // Update sidebar category labels
        document.querySelectorAll('.sidebar-label[data-category]').forEach(el => {
            const [c, s] = el.dataset.category.split('/');
            const info = i18n.getLocalizedCategory(c, s);
            if (info) el.textContent = info.label;
        });
        // Re-render active view
        if (currentView === 'detail' && currentCmd) {
            openCommandDetail(currentCmd);
        } else if (currentView === 'search') {
            const q = elGlobalSearch.value.trim();
            if (q) elGlobalSearch.dispatchEvent(new Event('input'));
            else navigateTo('home');
        } else {
            navigateTo(currentView);
        }
    });
}

// ─── Bootstrap ───────────────────────────────────────────────────────────
navigateTo('home');
