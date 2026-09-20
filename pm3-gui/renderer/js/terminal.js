// PM3 HotMan — Terminal Module
// Handles the raw terminal overlay: input, output coloring, history
'use strict';

const terminal = (() => {
    let isOpen = false;
    let cmdHistory = [];
    let historyIdx = -1;
    let sessionParser = null;

    const elOverlay  = () => document.getElementById('terminal-overlay');
    const elBody     = () => document.getElementById('terminal-body');
    const elInput    = () => document.getElementById('terminal-input');

    function init(parserInstance) {
        sessionParser = parserInstance;

        document.getElementById('btn-terminal').addEventListener('click', open);
        document.getElementById('btn-close-terminal').addEventListener('click', close);
        document.getElementById('btn-terminal-send').addEventListener('click', sendInput);

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
        isOpen = true;
        setTimeout(() => elInput().focus(), 50);
    }

    function close() {
        elOverlay().classList.add('hidden');
        isOpen = false;
    }

    function sendInput() {
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
        window.pm3api.send(cmd).catch(err => {
            appendLine(`[!] Errore invio: ${err.message}`, 'error');
        });

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
