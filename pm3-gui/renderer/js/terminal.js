// PM3 HotMan — Terminal Module
// Handles the raw terminal overlay: input, output coloring, history
'use strict';

const terminal = (() => {
    let isOpen = false;
    let cmdHistory = [];
    let historyIdx = -1;
    let sessionParser = null;

    const elOverlay  = () => document.getElementById('terminal-overlay');
    const elWindow   = () => document.getElementById('terminal-window');
    const elBody     = () => document.getElementById('terminal-body');
    const elInput    = () => document.getElementById('terminal-input');

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    function init(parserInstance) {
        sessionParser = parserInstance;

        document.getElementById('btn-terminal').addEventListener('click', open);
        document.getElementById('btn-close-terminal').addEventListener('click', close);
        document.getElementById('btn-terminal-send').addEventListener('click', sendInput);
        setupResizeHandles();
        window.addEventListener('resize', keepWithinOverlay);

        const input = elInput();
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); sendInput(); }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIdx < cmdHistory.length - 1) {
                    historyIdx++;
                    input.value = cmdHistory[cmdHistory.length - 1 - historyIdx] || '';
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIdx > 0) { historyIdx--; input.value = cmdHistory[cmdHistory.length - 1 - historyIdx] || ''; }
                else { historyIdx = -1; input.value = ''; }
            }
        });

        // Close on backdrop click
        elOverlay().addEventListener('click', e => { if (e.target === elOverlay()) close(); });

        // Escape to close
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && isOpen) close();
        });
    }

    function open() {
        elOverlay().classList.remove('hidden');
        keepWithinOverlay();
        isOpen = true;
        setTimeout(() => elInput().focus(), 50);
    }

    function close() {
        elOverlay().classList.add('hidden');
        isOpen = false;
    }

    function setupResizeHandles() {
        for (const handle of elWindow().querySelectorAll('[data-resize]')) {
            handle.addEventListener('pointerdown', event => startResize(event, handle));
        }
    }

    function startResize(event, handle) {
        if (event.button !== 0) return;

        const terminalWindow = elWindow();
        const overlayRect = elOverlay().getBoundingClientRect();
        const startRect = terminalWindow.getBoundingClientRect();
        const direction = handle.dataset.resize;
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = startRect.left - overlayRect.left;
        const startTop = startRect.top - overlayRect.top;
        const startRight = startLeft + startRect.width;
        const startBottom = startTop + startRect.height;
        const minWidth = 560;
        const minHeight = 340;
        const margin = 16;

        terminalWindow.classList.remove('animate-scale-in');
        terminalWindow.style.position = 'absolute';
        terminalWindow.style.left = `${startLeft}px`;
        terminalWindow.style.top = `${startTop}px`;
        terminalWindow.style.width = `${startRect.width}px`;
        terminalWindow.style.height = `${startRect.height}px`;

        const previousCursor = document.documentElement.style.cursor;
        const previousUserSelect = document.documentElement.style.userSelect;
        document.documentElement.style.cursor = getComputedStyle(handle).cursor;
        document.documentElement.style.userSelect = 'none';
        handle.setPointerCapture(event.pointerId);

        const move = moveEvent => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            let left = startLeft;
            let top = startTop;
            let width = startRect.width;
            let height = startRect.height;

            if (direction.includes('e')) {
                width = clamp(startRect.width + dx, minWidth, overlayRect.width - margin - startLeft);
            }
            if (direction.includes('w')) {
                left = clamp(startLeft + dx, margin, startRight - minWidth);
                width = startRight - left;
            }
            if (direction.includes('s')) {
                height = clamp(startRect.height + dy, minHeight, overlayRect.height - margin - startTop);
            }
            if (direction.includes('n')) {
                top = clamp(startTop + dy, margin, startBottom - minHeight);
                height = startBottom - top;
            }

            terminalWindow.style.left = `${left}px`;
            terminalWindow.style.top = `${top}px`;
            terminalWindow.style.width = `${width}px`;
            terminalWindow.style.height = `${height}px`;
        };

        const finish = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', finish);
            handle.removeEventListener('pointercancel', finish);
            document.documentElement.style.cursor = previousCursor;
            document.documentElement.style.userSelect = previousUserSelect;
        };

        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        event.preventDefault();
    }

    function keepWithinOverlay() {
        const terminalWindow = elWindow();
        if (!terminalWindow.style.left) return;

        const overlayRect = elOverlay().getBoundingClientRect();
        const rect = terminalWindow.getBoundingClientRect();
        const margin = 16;
        const width = Math.min(rect.width, overlayRect.width - margin * 2);
        const height = Math.min(rect.height, overlayRect.height - margin * 2);
        const left = clamp(rect.left - overlayRect.left, margin, overlayRect.width - margin - width);
        const top = clamp(rect.top - overlayRect.top, margin, overlayRect.height - margin - height);

        terminalWindow.style.left = `${left}px`;
        terminalWindow.style.top = `${top}px`;
        terminalWindow.style.width = `${width}px`;
        terminalWindow.style.height = `${height}px`;
    }

    async function sendInput() {
        const input = elInput();
        const cmd = input.value.trim();
        if (!cmd) return;

        // Add to history
        cmdHistory.push(cmd);
        if (cmdHistory.length > 100) cmdHistory.shift();
        historyIdx = -1;

        // Echo in terminal
        appendLine(`pm3> ${cmd}`, 'prompt');

        // Send to process
        try {
            const result = await window.pm3api.send(cmd);
            if (result.success) {
                window.dispatchEvent(new CustomEvent('pm3-command-started', { detail: { cmd } }));
            } else {
                appendLine(typeof i18n !== 'undefined' ? i18n.t('terminal.already_running') : '[!] Un altro comando è già in esecuzione.', 'warning');
            }
        } catch (err) {
            appendLine(typeof i18n !== 'undefined' ? i18n.t('terminal.send_error', { err: err.message }) : `[!] Errore invio: ${err.message}`, 'error');
        }

        input.value = '';
    }

    function appendLine(text, cls = 'normal') {
        const body = elBody();
        const div = document.createElement('div');
        div.className = `out-line ${cls}`;
        div.textContent = text;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
    }

    function appendRaw(rawText) {
        const body = elBody();
        const lines = rawText.split(/\r?\n/);
        for (const raw of lines) {
            if (!raw) continue;
            const clean = typeof stripAnsi !== 'undefined' ? stripAnsi(raw) : raw;
            const cls = typeof lineClass !== 'undefined' ? lineClass(raw) : 'normal';
            const div = document.createElement('div');
            div.className = `out-line ${cls}`;
            div.textContent = clean;
            body.appendChild(div);
        }
        body.scrollTop = body.scrollHeight;
    }

    function clear() {
        const body = elBody();
        if (body) body.innerHTML = '';
    }

    return { init, open, close, appendLine, appendRaw, clear };
})();
