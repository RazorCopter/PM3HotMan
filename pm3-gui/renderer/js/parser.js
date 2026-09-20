// PM3 HotMan — Output Parser
// Interprets pm3 client text output into structured, displayable objects
'use strict';

// ─── ANSI stripping ───────────────────────────────────────────────────────
const ANSI_RE = /\x1B\[[0-9;]*[mGKHF]|\x1B\[[0-9;]*[A-Za-z]/g;
function stripAnsi(s) { return s.replace(ANSI_RE, ''); }

// Color classes based on pm3 prefix
function lineClass(raw) {
    const s = stripAnsi(raw);
    if (s.includes('[+]') || s.includes('[=][ ok ]') || s.includes('[ ok ]')) return 'success';
    if (s.includes('[!]') || s.includes('[=][ warn ]') || s.includes('[ warn ]')) return 'warning';
    if (s.includes('[-]') || s.includes('[ err ]') || s.includes('error') || s.includes('Error')) return 'error';
    if (s.includes('[=]') || s.includes('[#]') || s.includes('[*]')) return 'info';
    if (s.includes('[?]')) return 'warning';
    return 'normal';
}

// ─── Structured extraction patterns ──────────────────────────────────────

const PATTERNS = {

    // UID
    uid: /UID\s*[:\-]\s*([0-9A-Fa-f\s]{4,})/,

    // UID 4-byte (common short form)
    uid_short: /UID\s+([0-9A-Fa-f]{2}(?:\s[0-9A-Fa-f]{2}){3,})/i,

    // ATQA
    atqa: /ATQA\s*[:\-]\s*([0-9A-Fa-f\s]+)/i,

    // SAK
    sak:  /SAK\s*[:\-]\s*([0-9A-Fa-f]{1,3})/i,

    // ATS
    ats:  /ATS\s*[:\-]\s*([0-9A-Fa-f\s]+)/i,

    // Tag type / card type
    type: /(?:Tag type|Type|Card type|Possible types?)\s*[:\-]\s*(.+)|([a-zA-Z0-9\s]+(?:based card|compatible))/i,

    // Found key
    key_found: /(?:Found valid key|Key\s*[AB])\s*[:\-\.]+\s*([0-9A-Fa-f]{12})/i,

    // Key A or B
    key_a: /Key\s*A\s*[:\-\.]+\s*([0-9A-Fa-f]{12})/i,
    key_b: /Key\s*B\s*[:\-\.]+\s*([0-9A-Fa-f]{12})/i,

    // Block data line: Block XX: XX XX XX XX ... or Block 0.........
    block: /[Bb]lock\s+(\d+)\s*[:\-\.]+\s*([0-9A-Fa-f\s]{8,})/,

    // Sector data
    sector: /[Ss]ector\s+(\d+)/,

    // FM / freq
    freq: /(\d+[\.,]\d+)\s*[Kk][Hh][Zz]/,

    // Rate
    rate: /[Bb]aud\s*rate\s*[:\-]\s*(\d+)/i,

    // Version / FW
    firmware: /Firmware\s*[vV]ersion?\s*[:\-]\s*(.+)/i,
    bootrom:  /[Bb]ootrom\s*[:\-]\s*(.+)/i,

    // hw info fields
    hw_platform: /platform\s*[:\-]\s*(.+)/i,
    hw_chip:     /chip\s*[:\-]\s*(.+)/i,
    hw_mem:      /mem(?:ory)?\s*[:\-]\s*(.+)/i,

    // Antenna tune voltage
    lf_voltage: /LF antenna\s*[:\-]\s*(\d+[\.,]\d+)\s*V/i,
    hf_voltage: /HF antenna\s*[:\-]\s*(\d+[\.,]\d+)\s*V/i,

    // Em410x ID
    em410x_id: /EM4100 ID\s*[:\-]\s*([0-9A-Fa-f]{10})/i,

    // HID raw
    hid_raw: /raw\s*[:\-]\s*([0-9A-Fa-f]+)/i,
    hid_facility: /facility\s*code\s*[:\-]\s*(\d+)/i,
    hid_card:     /card\s*(?:number|num|#|id)?\s*[:\-]\s*(\d+)/i,

    // iClass
    iclass_csn: /CSN\s*[:\-]\s*([0-9A-Fa-f\s]{23})/i,

    // DESFire
    desfire_uid:    /UID\s*[:\-]\s*([0-9A-Fa-f\s]{20})/i,
    desfire_hw_ver: /HW version\s*[:\-]\s*(.+)/i,
    desfire_sw_ver: /SW version\s*[:\-]\s*(.+)/i,

    // Autopwn
    autopwn_ok: /Autopwn\s*(?:completed|execution\s*time)/i,
    
    // Dump files
    dump_bin: /Saved.*?to binary file\s+[`']?([^`']+)[`']?/i,
    dump_json: /Saved to json file\s+[`']?([^`']+)[`']?/i,
    dump_keys: /Found keys have been dumped to\s+[`']?([^`']+)[`']?/i,

    // pm3 prompt (session alive)
    prompt: /\[usb\]|pm3\s*>/,

    // Error patterns
    no_tag: /(?:no tag|tag not found|no card|failed to select)/i,
    auth_failed: /(?:auth.*fail|authentication.*fail)/i,
    timeout: /timeout/i,
};

// ─── Main parser function ─────────────────────────────────────────────────

/**
 * Parse a chunk of pm3 output text.
 * Returns { lines: [{raw, clean, cls}], cards: [...], status }
 */
function parseOutput(rawText) {
    const lines = rawText.split(/\r?\n/).filter(l => l.length > 0);

    const result = {
        lines: [],     // All lines with class
        cards: [],     // Structured info cards to show in the UI
        status: null,  // 'success' | 'error' | 'warning' | null
        fields: {},    // Key-value pairs extracted
    };

    for (const raw of lines) {
        const clean = stripAnsi(raw).trim();
        const cls   = lineClass(raw);
        result.lines.push({ raw, clean, cls });

        // Extract structured data
        extractFields(clean, result);
    }

    // Determine overall status
    const hasError   = result.lines.some(l => l.cls === 'error');
    const hasSuccess = result.lines.some(l => l.cls === 'success');
    if (hasError && !hasSuccess)    result.status = 'error';
    else if (hasSuccess)             result.status = 'success';
    else if (result.lines.some(l => l.cls === 'warning')) result.status = 'warning';

    // Build structured cards
    result.cards = buildCards(result.fields, result.lines);

    return result;
}

function extractFields(clean, result) {
    const f = result.fields;

    tryMatch(clean, PATTERNS.uid, m => {
        f.uid = f.uid || m[1].replace(/\s+/g, ' ').trim().toUpperCase();
    });
    tryMatch(clean, PATTERNS.uid_short, m => {
        f.uid = f.uid || m[1].replace(/\s+/g, ' ').trim().toUpperCase();
    });
    tryMatch(clean, PATTERNS.atqa, m => { f.atqa = f.atqa || m[1].trim().toUpperCase(); });
    tryMatch(clean, PATTERNS.sak,  m => { f.sak  = f.sak  || m[1].trim().toUpperCase(); });
    tryMatch(clean, PATTERNS.ats,  m => { f.ats  = f.ats  || m[1].trim().toUpperCase(); });
    tryMatch(clean, PATTERNS.type, m => { 
        const val = m[1] || m[2];
        f.type = f.type || val.trim(); 
    });

    // Keys
    tryMatch(clean, PATTERNS.key_a, m => {
        f.keys = f.keys || {};
        f.keys['A'] = f.keys['A'] || m[1].toUpperCase();
    });
    tryMatch(clean, PATTERNS.key_b, m => {
        f.keys = f.keys || {};
        f.keys['B'] = f.keys['B'] || m[1].toUpperCase();
    });
    tryMatch(clean, PATTERNS.key_found, m => {
        f.keys_found = f.keys_found || new Set();
        f.keys_found.add(m[1].toUpperCase());
    });

    // Blocks
    tryMatch(clean, PATTERNS.block, m => {
        f.blocks = f.blocks || {};
        f.blocks[parseInt(m[1])] = m[2].trim().toUpperCase();
    });

    // Antenna
    tryMatch(clean, PATTERNS.lf_voltage, m => { f.lf_voltage = m[1] + ' V'; });
    tryMatch(clean, PATTERNS.hf_voltage, m => { f.hf_voltage = m[1] + ' V'; });

    // Firmware
    tryMatch(clean, PATTERNS.firmware, m => { f.firmware = m[1].trim(); });

    // EM410x
    tryMatch(clean, PATTERNS.em410x_id, m => { f.em410x_id = m[1].toUpperCase(); });

    // HID
    tryMatch(clean, PATTERNS.hid_facility, m => { f.hid_facility = m[1]; });
    tryMatch(clean, PATTERNS.hid_card,     m => { f.hid_card     = m[1]; });
    tryMatch(clean, PATTERNS.hid_raw,      m => { f.hid_raw      = m[1].toUpperCase(); });

    // iClass
    tryMatch(clean, PATTERNS.iclass_csn, m => { f.csn = m[1].trim().toUpperCase(); });

    // Errors
    if (PATTERNS.no_tag.test(clean))      f.no_tag = true;
    if (PATTERNS.auth_failed.test(clean)) f.auth_failed = true;
    if (PATTERNS.timeout.test(clean))     f.timeout = true;
    if (PATTERNS.autopwn_ok.test(clean))  f.autopwn_ok = true;

    // Dumps
    tryMatch(clean, PATTERNS.dump_bin, m => { f.dump_bin = m[1].trim(); });
    tryMatch(clean, PATTERNS.dump_json, m => { f.dump_json = m[1].trim(); });
    tryMatch(clean, PATTERNS.dump_keys, m => { f.dump_keys = m[1].trim(); });
}

function tryMatch(str, regex, fn) {
    const m = str.match(regex);
    if (m) fn(m);
}

function buildCards(f, lines) {
    const cards = [];

    // Error cards first
    if (f.no_tag) {
        cards.push({ type: 'error', title: 'Nessun tag rilevato', icon: '❌',
            text: 'Avvicina il tag all\'antenna del Proxmark3 e riprova.' });
        return cards;
    }
    if (f.auth_failed) {
        cards.push({ type: 'warning', title: 'Autenticazione fallita', icon: '🔐',
            text: 'La chiave specificata non è corretta per questo settore.' });
    }
    if (f.timeout) {
        cards.push({ type: 'error', title: 'Timeout', icon: '⏱',
            text: 'Il dispositivo non ha risposto in tempo.' });
        return cards;
    }

    // Tag card
    if (f.uid) {
        const fields = [{ label: 'UID', value: f.uid, mono: true }];
        if (f.atqa) fields.push({ label: 'ATQA', value: f.atqa, mono: true });
        if (f.sak)  fields.push({ label: 'SAK',  value: f.sak,  mono: true });
        if (f.type) fields.push({ label: 'Tipo',  value: f.type });
        cards.push({ type: 'tag', icon: '🏷', title: 'Tag rilevato', fields });
    }

    // EM410x card
    if (f.em410x_id) {
        cards.push({ type: 'tag', icon: '📻', title: 'Tag EM410x',
            fields: [{ label: 'ID', value: f.em410x_id, mono: true }] });
    }

    // HID card
    if (f.hid_facility || f.hid_card) {
        const fields = [];
        if (f.hid_facility) fields.push({ label: 'Facility Code', value: f.hid_facility });
        if (f.hid_card)     fields.push({ label: 'Card Number',   value: f.hid_card });
        if (f.hid_raw)      fields.push({ label: 'Raw',           value: f.hid_raw, mono: true });
        cards.push({ type: 'tag', icon: '🏷', title: 'Card HID Proximity', fields });
    }

    // iClass CSN
    if (f.csn) {
        cards.push({ type: 'tag', icon: '🏢', title: 'iClass CSN',
            fields: [{ label: 'CSN', value: f.csn, mono: true }] });
    }

    // Keys found
    if (f.keys_found && f.keys_found.size > 0) {
        const fields = [...f.keys_found].map((k, i) => ({ label: `Chiave ${i+1}`, value: k, mono: true }));
        cards.push({ type: 'success', icon: '🔑', title: `${f.keys_found.size} chiave/i trovata/e`, fields });
    }
    if (f.keys) {
        const fields = Object.entries(f.keys).map(([t, v]) => ({ label: `Key ${t}`, value: v, mono: true }));
        if (fields.length) cards.push({ type: 'success', icon: '🔑', title: 'Chiavi estratte', fields });
    }

    // Blocks table
    if (f.blocks && Object.keys(f.blocks).length > 0) {
        const rows = Object.entries(f.blocks)
            .sort(([a], [b]) => a - b)
            .map(([blk, data]) => ({ blk: parseInt(blk), data }));
        cards.push({ type: 'table', icon: '📋', title: 'Blocchi letti', rows });
    }

    // Antenna tune
    if (f.lf_voltage || f.hf_voltage) {
        const fields = [];
        if (f.lf_voltage) fields.push({ label: 'LF Antenna', value: f.lf_voltage });
        if (f.hf_voltage) fields.push({ label: 'HF Antenna', value: f.hf_voltage });
        cards.push({ type: 'info', icon: '📡', title: 'Test Antenna', fields });
    }

    // Firmware
    if (f.firmware) {
        cards.push({ type: 'info', icon: '📦', title: 'Firmware',
            fields: [{ label: 'Versione', value: f.firmware }] });
    }

    // Autopwn success
    if (f.autopwn_ok) {
        cards.push({ type: 'success', icon: '🔓', title: 'Autopwn completato con successo!',
            text: 'Tutte le chiavi sono state recuperate. Controlla il file di dump generato.' });
    }

    // Dump files
    if (f.dump_bin || f.dump_json || f.dump_keys) {
        const fields = [];
        if (f.dump_keys) fields.push({ label: 'Chiavi', value: f.dump_keys, mono: true });
        if (f.dump_bin) fields.push({ label: 'Dump Bin', value: f.dump_bin, mono: true });
        if (f.dump_json) fields.push({ label: 'Dump JSON', value: f.dump_json, mono: true });
        
        // Find the first valid path to use for "Open Folder" action
        const anyPath = f.dump_keys || f.dump_bin || f.dump_json;
        cards.push({ 
            type: 'info', 
            icon: '📁', 
            title: 'File Salvati', 
            fields,
            action: { label: 'Apri Cartella', data: anyPath }
        });
    }

    return cards;
}

// ─── Stream parser (accumulates output per session) ───────────────────────
class SessionParser {
    constructor() {
        this._buffer = '';
        this._allLines = [];
        this._allFields = {};
        this._allCards = [];
    }

    feed(chunk) {
        this._buffer += chunk;
        const parts = this._buffer.split(/\r?\n/);
        this._buffer = parts.pop(); // last incomplete line stays buffered

        const newLines = [];
        for (const raw of parts) {
            if (!raw.length) continue;
            const clean = stripAnsi(raw).trim();
            const cls   = lineClass(raw);
            this._allLines.push({ raw, clean, cls });
            newLines.push({ raw, clean, cls });
            extractFields(clean, { fields: this._allFields });
        }
        // Rebuild cards from all accumulated fields
        this._allCards = buildCards(this._allFields, this._allLines);

        return {
            newLines,
            cards: this._allCards,
            fields: { ...this._allFields },
        };
    }

    reset() {
        this._buffer = '';
        this._allLines = [];
        this._allFields = {};
        this._allCards = [];
    }

    flush() {
        const newLines = [];
        if (this._buffer.length > 0) {
            const raw = this._buffer;
            const clean = stripAnsi(raw).trim();
            const cls = lineClass(raw);
            this._allLines.push({ raw, clean, cls });
            newLines.push({ raw, clean, cls });
            extractFields(clean, { fields: this._allFields });
            this._buffer = '';
            this._allCards = buildCards(this._allFields, this._allLines);
        }
        return {
            newLines,
            cards: this._allCards,
            fields: { ...this._allFields },
        };
    }

    get lines() { return this._allLines; }
    get cards() { return this._allCards; }
}

// Export
if (typeof module !== 'undefined') {
    module.exports = { parseOutput, SessionParser, stripAnsi, lineClass };
}
