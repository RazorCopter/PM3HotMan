// PM3 HotMan — UI Helper Components
'use strict';

/**
 * Renders a command card element
 */
function renderCmdCard(cmd, onClick) {
    const locCmd = typeof i18n !== 'undefined' ? i18n.getLocalizedCommand(cmd) : cmd;
    const card = document.createElement('div');
    card.className = `cmd-card${locCmd.featured ? ' featured' : ''}${locCmd.dangerous ? ' dangerous' : ''}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', locCmd.name);
    card.id = `cmd-card-${locCmd.id}`;

    const warnBadge = typeof i18n !== 'undefined' ? i18n.t('detail.card_warning') : '⚠ Attenzione';

    card.innerHTML = `
        <div class="cmd-card__icon">${locCmd.icon || '⚙'}</div>
        <div class="cmd-card__name">${locCmd.name}</div>
        <div class="cmd-card__desc">${locCmd.description.length > 80 ? locCmd.description.slice(0, 80) + '…' : locCmd.description}</div>
        <div class="cmd-card__footer">
            <code class="cmd-card__cmd">${locCmd.pm3cmd.replace(/ \{[^}]+\}/g, ' …')}</code>
            ${locCmd.dangerous ? `<span class="badge badge-error">${warnBadge}</span>` : ''}
        </div>
    `;

    const handler = () => onClick(cmd);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    return card;
}

/**
 * Renders a result card element from parser output
 */
function renderResultCard(cardData) {
    const div = document.createElement('div');
    div.className = `result-card ${cardData.type || 'info'}`;

    const typeColors = {
        tag: '#a78bfa', success: '#4ade80', error: '#f87171',
        warning: '#fbbf24', info: '#67e8f9', table: '#94a3b8',
    };
    const color = typeColors[cardData.type] || '#94a3b8';

    let inner = `
        <div class="result-card__header">
            <span class="result-card__icon">${cardData.icon || 'ℹ'}</span>
            <span class="result-card__title" style="color:${color}">${cardData.title}</span>
        </div>
    `;

    if (cardData.text) {
        inner += `<div class="result-card__text">${cardData.text}</div>`;
    }

    if (cardData.fields && cardData.fields.length > 0) {
        inner += '<div class="result-fields">';
        for (const f of cardData.fields) {
            inner += `
                <div class="result-field">
                    <span class="result-field__label">${f.label}</span>
                    <span class="result-field__value${f.mono ? ' mono' : ''}">${escapeHtml(f.value || '')}</span>
                </div>
            `;
        }
        inner += '</div>';
    }

    // Blocks table
    if (cardData.type === 'table' && cardData.rows) {
        const thBlk = typeof i18n !== 'undefined' ? i18n.t('parser.table_blk') : 'Blk';
        const thData = typeof i18n !== 'undefined' ? i18n.t('parser.table_data') : 'Dati (hex)';
        inner += `<table class="blocks-table">
            <thead><tr><th>${thBlk}</th><th>${thData}</th></tr></thead>
            <tbody>`;
        for (const r of cardData.rows.slice(0, 20)) {
            inner += `<tr><td class="blk-num">${r.blk}</td><td class="blk-data">${escapeHtml(r.data)}</td></tr>`;
        }
        if (cardData.rows.length > 20) {
            const moreText = typeof i18n !== 'undefined'
                ? i18n.t('parser.table_more', { count: cardData.rows.length - 20 })
                : `… e altri ${cardData.rows.length - 20} blocchi`;
            inner += `<tr><td colspan="2" style="color:var(--text-muted);font-size:0.7rem">${moreText}</td></tr>`;
        }
        inner += '</tbody></table>';
    }

    div.innerHTML = inner;

    // Add action button if present
    if (cardData.action) {
        const btnDiv = document.createElement('div');
        btnDiv.style.marginTop = 'var(--sp-3)';
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm';
        const actionLabel = (cardData.action.label === 'Apri Cartella' && typeof i18n !== 'undefined')
            ? i18n.t('parser.open_folder')
            : cardData.action.label;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> ${escapeHtml(actionLabel)}`;
        btn.addEventListener('click', () => {
            if (window.pm3api && window.pm3api.showItemInFolder) {
                window.pm3api.showItemInFolder(cardData.action.data);
            }
        });
        btnDiv.appendChild(btn);
        div.appendChild(btnDiv);
    }

    return div;
}

/**
 * Renders a param form for a command
 */
function renderParamForm(cmd, container) {
    container.innerHTML = '';
    const locCmd = typeof i18n !== 'undefined' ? i18n.getLocalizedCommand(cmd) : cmd;

    if (!locCmd.params || locCmd.params.length === 0) {
        const noParams = typeof i18n !== 'undefined' ? i18n.t('detail.no_params') : 'Questo comando non richiede parametri.';
        const pressRun = typeof i18n !== 'undefined' ? i18n.t('detail.press_run') : 'Premi Esegui per lanciarlo.';
        container.innerHTML = `
            <div class="no-params-msg">
                <div style="font-size:2rem;margin-bottom:8px">✅</div>
                <div>${noParams}</div>
                <div class="text-xs text-muted mt-2">${pressRun}</div>
            </div>`;
        return;
    }

    const browseLabel = typeof i18n !== 'undefined' ? i18n.t('detail.browse') : 'Sfoglia…';

    for (const p of locCmd.params) {
        const group = document.createElement('div');
        group.className = 'input-group';

        const label = document.createElement('label');
        label.className = 'input-label';
        label.htmlFor = `param-${p.id}`;
        label.textContent = p.label;

        let inputEl;

        if (p.type === 'select') {
            inputEl = document.createElement('select');
            inputEl.id = `param-${p.id}`;
            inputEl.name = p.id;
            for (const opt of p.options || []) {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                if (opt.value === (p.defaultValue ?? '')) o.selected = true;
                inputEl.appendChild(o);
            }
        } else if (p.type === 'file') {
            const wrap = document.createElement('div');
            wrap.className = 'file-input-wrap';
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.id = `param-${p.id}`;
            inputEl.name = p.id;
            inputEl.placeholder = p.placeholder || '';
            if (p.mono) inputEl.style.fontFamily = 'var(--font-mono)';
            const browseBtn = document.createElement('button');
            browseBtn.type = 'button';
            browseBtn.className = 'btn btn-secondary btn-sm';
            browseBtn.textContent = browseLabel;
            browseBtn.addEventListener('click', async () => {
                const path = await window.pm3api.openFile(p.filters || []);
                if (path) inputEl.value = path;
            });
            wrap.appendChild(inputEl);
            wrap.appendChild(browseBtn);
            group.appendChild(label);
            group.appendChild(wrap);
            if (p.hint) {
                const hint = document.createElement('span');
                hint.className = 'input-hint';
                hint.textContent = p.hint;
                group.appendChild(hint);
            }
            container.appendChild(group);
            continue;
        } else {
            inputEl = document.createElement('input');
            inputEl.type = p.type || 'text';
            inputEl.id = `param-${p.id}`;
            inputEl.name = p.id;
            inputEl.placeholder = p.placeholder || '';
            if (p.mono) inputEl.style.fontFamily = 'var(--font-mono)';
            if (p.maxlength) inputEl.maxLength = p.maxlength;
            if (p.min !== undefined) inputEl.min = p.min;
            if (p.max !== undefined) inputEl.max = p.max;
        }

        group.appendChild(label);
        group.appendChild(inputEl);

        if (p.hint) {
            const hint = document.createElement('span');
            hint.className = 'input-hint';
            hint.textContent = p.hint;
            group.appendChild(hint);
        }

        container.appendChild(group);
    }
}

/**
 * Collect form values from rendered param form
 */
function collectFormValues(cmd) {
    const values = {};
    for (const p of cmd.params || []) {
        const el = document.getElementById(`param-${p.id}`);
        if (el) values[p.id] = el.value.trim();
    }
    return values;
}

/**
 * Validate form values; returns null if ok, or error string
 */
function validateFormValues(cmd, values) {
    const locCmd = typeof i18n !== 'undefined' ? i18n.getLocalizedCommand(cmd) : cmd;
    for (const p of locCmd.params || []) {
        if (p.required === false) continue;
        const v = values[p.id];
        if (!v && p.type !== 'select') {
            return typeof i18n !== 'undefined'
                ? i18n.t('detail.param_required', { label: p.label })
                : `Il campo "${p.label}" è obbligatorio.`;
        }
        if (p.maxlength && v && v.replace(/\s/g, '').length > p.maxlength) {
            return typeof i18n !== 'undefined'
                ? i18n.t('detail.param_maxlength', { label: p.label, max: p.maxlength })
                : `Il campo "${p.label}" deve avere al massimo ${p.maxlength} caratteri.`;
        }
    }
    return null;
}

/** Escape HTML */
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Format ANSI-colored terminal line to HTML */
function ansiToHtml(raw) {
    // Strip ANSI and return plain but with class applied via lineClass
    const ANSI_RE = /\x1B\[[0-9;]*[mGKHF]|\x1B\[[0-9;]*[A-Za-z]/g;
    return escapeHtml(raw.replace(ANSI_RE, ''));
}

/** Show a temporary toast notification */
function showToast(msg, type = 'info', durationMs = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            display: flex; flex-direction: column; gap: 8px;
            z-index: 9999; pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#06b6d4' };
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: var(--bg-elevated);
        border: 1px solid ${colors[type] || colors.info}44;
        border-left: 3px solid ${colors[type] || colors.info};
        border-radius: var(--r-md);
        padding: 10px 16px;
        font-size: 0.8rem;
        color: var(--text-primary);
        box-shadow: var(--shadow-md);
        animation: fadeIn 0.2s ease both;
        pointer-events: all;
        max-width: 300px;
    `;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, durationMs);
}
