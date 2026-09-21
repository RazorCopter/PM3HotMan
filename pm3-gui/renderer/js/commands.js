// PM3 HotMan — Command Catalog
// Each command has: id, name, description, pm3cmd (template), params[], category, subcategory, icon, tags
'use strict';

const COMMANDS = [

    // ═══════════════════════════════════════════════════════════════════════
    //  HARDWARE
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'hw-info', name: 'Info hardware', icon: '🖥',
        category: 'hw', subcategory: null,
        description: 'Mostra informazioni dettagliate sull\'hardware del Proxmark3 (firmware, FPGA, chip).',
        pm3cmd: 'hw info',
        params: [],
        tags: ['hardware', 'info', 'version'],
    },
    {
        id: 'hw-ver', name: 'Versione firmware', icon: '📦',
        category: 'hw', subcategory: null,
        description: 'Mostra la versione del firmware e del client pm3.',
        pm3cmd: 'hw ver',
        params: [],
        tags: ['hardware', 'version', 'firmware'],
    },
    {
        id: 'hw-tune', name: 'Tune antenna', icon: '📡',
        category: 'hw', subcategory: null,
        description: 'Testa e ottimizza l\'antenna LF e HF del Proxmark3. Mostra i valori di tensione.',
        pm3cmd: 'hw tune',
        params: [],
        tags: ['antenna', 'tune', 'hardware'],
    },
    {
        id: 'hw-status', name: 'Status device', icon: '📊',
        category: 'hw', subcategory: null,
        description: 'Mostra lo stato corrente del Proxmark3 (flash, FPGA, USB).',
        pm3cmd: 'hw status',
        params: [],
        tags: ['hardware', 'status'],
    },
    {
        id: 'hw-reset', name: 'Reset device', icon: '🔄',
        category: 'hw', subcategory: null,
        description: 'Riavvia il Proxmark3.',
        pm3cmd: 'hw reset',
        params: [],
        tags: ['hardware', 'reset'],
        dangerous: true,
    },
    {
        id: 'hw-pingtime', name: 'Ping latenza', icon: '⏱',
        category: 'hw', subcategory: null,
        description: 'Misura la latenza di comunicazione USB con il Proxmark3.',
        pm3cmd: 'hw pingtime',
        params: [],
        tags: ['hardware', 'ping', 'latency'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  AUTO-DETECTION
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'auto', name: 'Auto-detection tag', icon: '🔍',
        category: 'auto', subcategory: null,
        description: 'Rileva automaticamente il tipo di tag (HF e LF). Il comando più comodo per iniziare.',
        pm3cmd: 'auto',
        params: [],
        tags: ['auto', 'detect', 'search', 'quick'],
        featured: true,
    },
    {
        id: 'hf-search', name: 'Cerca tag HF', icon: '📶',
        category: 'auto', subcategory: null,
        description: 'Cerca un tag ad alta frequenza (13.56 MHz) nelle vicinanze.',
        pm3cmd: 'hf search',
        params: [],
        tags: ['hf', 'search', 'detect'],
        featured: true,
    },
    {
        id: 'lf-search', name: 'Cerca tag LF', icon: '📻',
        category: 'auto', subcategory: null,
        description: 'Cerca un tag a bassa frequenza (125 kHz / 134 kHz) nelle vicinanze.',
        pm3cmd: 'lf search',
        params: [],
        tags: ['lf', 'search', 'detect'],
        featured: true,
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  HF — ISO 14443-A / NFC
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'hf14a-scan', name: 'Scansiona tag NFC', icon: '📲',
        category: 'hf', subcategory: 'nfc',
        description: 'Esegue una scansione rapida di tutti i tag ISO 14443-A nelle vicinanze.',
        pm3cmd: 'hf 14a scan',
        params: [],
        tags: ['hf', 'nfc', '14a', 'scan'],
        featured: true,
    },
    {
        id: 'hf14a-info', name: 'Info tag NFC', icon: 'ℹ',
        category: 'hf', subcategory: 'nfc',
        description: 'Legge le informazioni complete di un tag ISO 14443-A (UID, ATQA, SAK, ATS).',
        pm3cmd: 'hf 14a info',
        params: [],
        tags: ['hf', 'nfc', '14a', 'info'],
    },
    {
        id: 'hf14a-apdu', name: 'Invia APDU raw', icon: '💬',
        category: 'hf', subcategory: 'nfc',
        description: 'Invia un comando APDU grezzo a un tag ISO 14443-A. Utile per test e debug.',
        pm3cmd: 'hf 14a apdu -d {apdu}',
        params: [
            { id: 'apdu', label: 'APDU (hex)', type: 'text', placeholder: '00A4040007D276000085010100', mono: true,
              hint: 'Sequenza esadecimale senza spazi' },
        ],
        tags: ['hf', 'nfc', '14a', 'apdu', 'raw'],
    },
    {
        id: 'hf14a-reader', name: 'Modalità reader', icon: '👁',
        category: 'hf', subcategory: 'nfc',
        description: 'Attiva la modalità reader continua: rileva tag in avvicinamento.',
        pm3cmd: 'hf 14a reader',
        params: [],
        tags: ['hf', 'nfc', '14a', 'reader'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  HF — MIFARE Classic
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'hf-mf-info', name: 'Info MIFARE Classic', icon: '🃏',
        category: 'hf', subcategory: 'mf',
        description: 'Legge le informazioni di un tag MIFARE Classic: UID, tipo, configurazione.',
        pm3cmd: 'hf mf info',
        params: [],
        tags: ['hf', 'mifare', 'classic', 'info'],
        featured: true,
    },
    {
        id: 'hf-mf-autopwn', name: 'Auto-crack completo', icon: '🔓',
        category: 'hf', subcategory: 'mf',
        description: 'Tenta di recuperare tutte le chiavi di un MIFARE Classic con attacchi automatici (Hardnested, Darkside, etc.). Il comando più potente per il crack.',
        pm3cmd: 'hf mf autopwn',
        params: [],
        tags: ['hf', 'mifare', 'crack', 'autopwn', 'attack'],
        featured: true,
        dangerous: false,
    },
    {
        id: 'hf-mf-dump', name: 'Dump completo', icon: '💾',
        category: 'hf', subcategory: 'mf',
        description: 'Scarica l\'intero contenuto di un MIFARE Classic (tutti i settori) in un file.',
        pm3cmd: 'hf mf dump {sectors} -f {filename}',
        params: [
            { id: 'sectors', label: 'Numero settori', type: 'select',
              options: [
                  { value: '', label: 'Auto (1K/4K rilevato)' },
                  { value: '--1k', label: 'MIFARE 1K (16 settori)' },
                  { value: '--2k', label: 'MIFARE 2K (32 settori)' },
                  { value: '--4k', label: 'MIFARE 4K (40 settori)' },
              ],
              defaultValue: '' },
            { id: 'filename', label: 'Nome file output', type: 'text', placeholder: 'dump_tag', mono: true,
              hint: 'Senza estensione — verrà creato .bin e .eml' },
        ],
        tags: ['hf', 'mifare', 'dump', 'clone'],
    },
    {
        id: 'hf-mf-rdbl', name: 'Leggi blocco', icon: '📖',
        category: 'hf', subcategory: 'mf',
        description: 'Legge il contenuto di un singolo blocco MIFARE Classic.',
        pm3cmd: 'hf mf rdbl --blk {block} -k {key}',
        params: [
            { id: 'block', label: 'Numero blocco', type: 'number', placeholder: '0', min: 0, max: 255,
              hint: '0–63 per MIFARE 1K, 0–255 per MIFARE 4K' },
            { id: 'key', label: 'Chiave (hex)', type: 'text', placeholder: 'FFFFFFFFFFFF', mono: true,
              maxlength: 12, hint: '6 byte = 12 caratteri esadecimali' },
        ],
        tags: ['hf', 'mifare', 'read', 'block'],
    },
    {
        id: 'hf-mf-wrbl', name: 'Scrivi blocco', icon: '✏',
        category: 'hf', subcategory: 'mf',
        description: 'Scrive dati in un singolo blocco MIFARE Classic.',
        pm3cmd: 'hf mf wrbl --blk {block} -k {key} -d {data}',
        params: [
            { id: 'block', label: 'Numero blocco', type: 'number', placeholder: '1', min: 1, max: 255 },
            { id: 'key', label: 'Chiave (hex)', type: 'text', placeholder: 'FFFFFFFFFFFF', mono: true, maxlength: 12 },
            { id: 'data', label: 'Dati (32 hex)', type: 'text', placeholder: '00000000000000000000000000000000', mono: true, maxlength: 32,
              hint: '16 byte = 32 caratteri esadecimali' },
        ],
        tags: ['hf', 'mifare', 'write', 'block'],
        dangerous: true,
    },
    {
        id: 'hf-mf-restore', name: 'Ripristina dump', icon: '📤',
        category: 'hf', subcategory: 'mf',
        description: 'Ripristina un dump precedente su un tag MIFARE Classic (o clonabile).',
        pm3cmd: 'hf mf restore {sectors} -f {filename}',
        params: [
            { id: 'sectors', label: 'Tipo card', type: 'select',
              options: [
                  { value: '--1k', label: 'MIFARE 1K' },
                  { value: '--4k', label: 'MIFARE 4K' },
              ],
              defaultValue: '--1k' },
            { id: 'filename', label: 'File dump', type: 'file',
              placeholder: 'percorso/al/dump.bin',
              filters: [{ name: 'Dump MIFARE', extensions: ['bin', 'eml'] }] },
        ],
        tags: ['hf', 'mifare', 'restore', 'write'],
        dangerous: true,
    },
    {
        id: 'hf-mf-chk', name: 'Crack chiavi (dict)', icon: '🗝',
        category: 'hf', subcategory: 'mf',
        description: 'Tenta le chiavi di default e di un dizionario su tutti i settori.',
        pm3cmd: 'hf mf chk --1k',
        params: [],
        tags: ['hf', 'mifare', 'crack', 'dictionary', 'keys'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  HF — MIFARE Ultralight / NTAG
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'hf-mfu-info', name: 'Info Ultralight/NTAG', icon: '📋',
        category: 'hf', subcategory: 'mfu',
        description: 'Legge le informazioni di un tag MIFARE Ultralight o NTAG.',
        pm3cmd: 'hf mfu info',
        params: [],
        tags: ['hf', 'mifare', 'ultralight', 'ntag', 'info'],
        featured: true,
    },
    {
        id: 'hf-mfu-dump', name: 'Dump Ultralight', icon: '💾',
        category: 'hf', subcategory: 'mfu',
        description: 'Scarica il contenuto completo di un MIFARE Ultralight / NTAG.',
        pm3cmd: 'hf mfu dump -f {filename}',
        params: [
            { id: 'filename', label: 'Nome file output', type: 'text', placeholder: 'dump_ntag', mono: true },
        ],
        tags: ['hf', 'mifare', 'ultralight', 'dump'],
    },
    {
        id: 'hf-mfu-rdbl', name: 'Leggi pagina', icon: '📖',
        category: 'hf', subcategory: 'mfu',
        description: 'Legge una singola pagina (4 byte) da un MIFARE Ultralight.',
        pm3cmd: 'hf mfu rdbl -p {page}',
        params: [
            { id: 'page', label: 'Numero pagina', type: 'number', placeholder: '4', min: 0, max: 255 },
        ],
        tags: ['hf', 'mifare', 'ultralight', 'read'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  HF — MIFARE DESFire
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'hf-mfdes-info', name: 'Info DESFire', icon: '🔐',
        category: 'hf', subcategory: 'desfire',
        description: 'Legge le informazioni di un tag MIFARE DESFire (UID, versione, applicazioni).',
        pm3cmd: 'hf mfdes info',
        params: [],
        tags: ['hf', 'desfire', 'info'],
        featured: true,
    },
    {
        id: 'hf-mfdes-lsapp', name: 'Lista applicazioni', icon: '📂',
        category: 'hf', subcategory: 'desfire',
        description: 'Elenca tutte le applicazioni presenti su un tag MIFARE DESFire.',
        pm3cmd: 'hf mfdes lsapp',
        params: [],
        tags: ['hf', 'desfire', 'apps', 'list'],
    },
    {
        id: 'hf-mfdes-enum', name: 'Enumera tutto', icon: '🔎',
        category: 'hf', subcategory: 'desfire',
        description: 'Enumera applicazioni, file e dati del tag DESFire (autenticazione di default).',
        pm3cmd: 'hf mfdes enum',
        params: [],
        tags: ['hf', 'desfire', 'enum', 'enumerate'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  HF — iClass / SEOS
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'hf-iclass-info', name: 'Info iClass', icon: '🏢',
        category: 'hf', subcategory: 'iclass',
        description: 'Legge le informazioni di un tag HID iClass.',
        pm3cmd: 'hf iclass info',
        params: [],
        tags: ['hf', 'iclass', 'hid', 'info'],
        featured: true,
    },
    {
        id: 'hf-iclass-dump', name: 'Dump iClass', icon: '💾',
        category: 'hf', subcategory: 'iclass',
        description: 'Scarica il contenuto di un tag HID iClass usando la chiave specificata.',
        pm3cmd: 'hf iclass dump -k {key} -f {filename}',
        params: [
            { id: 'key', label: 'Chiave (16 hex)', type: 'text', placeholder: 'ae3d65a3dad436ef', mono: true,
              hint: '8 byte = 16 caratteri esadecimali' },
            { id: 'filename', label: 'Nome file output', type: 'text', placeholder: 'dump_iclass', mono: true },
        ],
        tags: ['hf', 'iclass', 'dump'],
    },
    {
        id: 'hf-seos-info', name: 'Info SEOS', icon: '🏢',
        category: 'hf', subcategory: 'iclass',
        description: 'Legge le informazioni di una card HID SEOS.',
        pm3cmd: 'hf seos info',
        params: [],
        tags: ['hf', 'seos', 'hid', 'info'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  HF — FeliCa
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'hf-felica-info', name: 'Info FeliCa', icon: '🇯🇵',
        category: 'hf', subcategory: 'felica',
        description: 'Legge le informazioni di un tag FeliCa (usato in Giappone per trasporti, pagamenti).',
        pm3cmd: 'hf felica info',
        params: [],
        tags: ['hf', 'felica', 'info'],
    },
    {
        id: 'hf-felica-scan', name: 'Scansiona FeliCa', icon: '🔍',
        category: 'hf', subcategory: 'felica',
        description: 'Cerca un tag FeliCa nelle vicinanze.',
        pm3cmd: 'hf felica scan',
        params: [],
        tags: ['hf', 'felica', 'scan'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  HF — ISO 15693
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'hf15-info', name: 'Info ISO 15693', icon: '📦',
        category: 'hf', subcategory: '15693',
        description: 'Legge le informazioni di un tag ISO 15693 (vicinity cards, tag warehouse).',
        pm3cmd: 'hf 15 info',
        params: [],
        tags: ['hf', '15693', 'info'],
    },
    {
        id: 'hf15-scan', name: 'Scansiona ISO 15693', icon: '🔍',
        category: 'hf', subcategory: '15693',
        description: 'Cerca un tag ISO 15693 nelle vicinanze.',
        pm3cmd: 'hf 15 scan',
        params: [],
        tags: ['hf', '15693', 'scan'],
    },
    {
        id: 'hf15-dump', name: 'Dump ISO 15693', icon: '💾',
        category: 'hf', subcategory: '15693',
        description: 'Scarica il contenuto completo di un tag ISO 15693.',
        pm3cmd: 'hf 15 dump -f {filename}',
        params: [
            { id: 'filename', label: 'Nome file output', type: 'text', placeholder: 'dump_iso15693', mono: true },
        ],
        tags: ['hf', '15693', 'dump'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  LF — EM410x
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'lf-em410x-read', name: 'Leggi EM410x', icon: '📻',
        category: 'lf', subcategory: 'em410x',
        description: 'Legge il codice ID di un tag EM410x (125 kHz). Il tag LF più comune.',
        pm3cmd: 'lf em 410x reader',
        params: [],
        tags: ['lf', 'em410x', 'read', '125khz'],
        featured: true,
    },
    {
        id: 'lf-em410x-sim', name: 'Simula EM410x', icon: '📡',
        category: 'lf', subcategory: 'em410x',
        description: 'Simula un tag EM410x con l\'ID specificato. Il Proxmark3 si comporta come quel tag.',
        pm3cmd: 'lf em 410x sim --id {id}',
        params: [
            { id: 'id', label: 'ID tag (10 hex)', type: 'text', placeholder: '1122334455', mono: true,
              maxlength: 10, hint: '5 byte = 10 caratteri esadecimali' },
        ],
        tags: ['lf', 'em410x', 'simulate', 'emulate'],
    },
    {
        id: 'lf-em410x-clone', name: 'Clona su T55xx', icon: '📋',
        category: 'lf', subcategory: 'em410x',
        description: 'Clona un ID EM410x su una card T55xx riscrivibile.',
        pm3cmd: 'lf em 410x clone --id {id}',
        params: [
            { id: 'id', label: 'ID tag (10 hex)', type: 'text', placeholder: '1122334455', mono: true,
              maxlength: 10 },
        ],
        tags: ['lf', 'em410x', 'clone', 't55xx'],
        dangerous: true,
    },
    {
        id: 'lf-em410x-watch', name: 'Watch EM410x', icon: '👁',
        category: 'lf', subcategory: 'em410x',
        description: 'Modalità continua: legge e mostra ogni tag EM410x che si avvicina.',
        pm3cmd: 'lf em 410x watch',
        params: [],
        tags: ['lf', 'em410x', 'watch', 'continuous'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  LF — HID / Wiegand
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'lf-hid-read', name: 'Leggi HID Prox', icon: '🏷',
        category: 'lf', subcategory: 'hid',
        description: 'Legge una card HID Proximity (26-bit, 35-bit, etc.).',
        pm3cmd: 'lf hid reader',
        params: [],
        tags: ['lf', 'hid', 'prox', 'wiegand', 'read'],
        featured: true,
    },
    {
        id: 'lf-hid-sim', name: 'Simula HID Prox', icon: '📡',
        category: 'lf', subcategory: 'hid',
        description: 'Simula una card HID Proximity con il codice specificato.',
        pm3cmd: 'lf hid sim -r {rawcode}',
        params: [
            { id: 'rawcode', label: 'Codice raw (hex)', type: 'text', placeholder: '2006F0230B', mono: true,
              hint: 'Usa prima "Leggi HID" per ottenere il codice raw' },
        ],
        tags: ['lf', 'hid', 'simulate', 'wiegand'],
    },
    {
        id: 'lf-hid-clone', name: 'Clona HID Prox', icon: '📋',
        category: 'lf', subcategory: 'hid',
        description: 'Clona una card HID Proximity su T55xx.',
        pm3cmd: 'lf hid clone -r {rawcode}',
        params: [
            { id: 'rawcode', label: 'Codice raw (hex)', type: 'text', placeholder: '2006F0230B', mono: true },
        ],
        tags: ['lf', 'hid', 'clone'],
        dangerous: true,
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  LF — T55xx (tag riscrivibili)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'lf-t55xx-detect', name: 'Detect T55xx', icon: '🔍',
        category: 'lf', subcategory: 't55xx',
        description: 'Rileva e identifica un tag T55xx (la card riscrivibile più comune a 125 kHz).',
        pm3cmd: 'lf t55xx detect',
        params: [],
        tags: ['lf', 't55xx', 'detect'],
    },
    {
        id: 'lf-t55xx-info', name: 'Info T55xx', icon: 'ℹ',
        category: 'lf', subcategory: 't55xx',
        description: 'Legge e decodifica la configurazione di un tag T55xx.',
        pm3cmd: 'lf t55xx info',
        params: [],
        tags: ['lf', 't55xx', 'info'],
    },
    {
        id: 'lf-t55xx-dump', name: 'Dump T55xx', icon: '💾',
        category: 'lf', subcategory: 't55xx',
        description: 'Legge tutti i blocchi di un tag T55xx.',
        pm3cmd: 'lf t55xx dump',
        params: [],
        tags: ['lf', 't55xx', 'dump'],
    },
    {
        id: 'lf-t55xx-wipe', name: 'Wipe T55xx', icon: '🗑',
        category: 'lf', subcategory: 't55xx',
        description: 'Cancella e ripristina un tag T55xx ai valori di fabbrica.',
        pm3cmd: 'lf t55xx wipe',
        params: [],
        tags: ['lf', 't55xx', 'wipe', 'reset'],
        dangerous: true,
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  ANALYSE / DATA
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'analyse-lcr', name: 'Calcola LRC/CRC', icon: '🧮',
        category: 'analyse', subcategory: null,
        description: 'Calcola LRC, CRC e checksum su dati hex.',
        pm3cmd: 'analyse lcr -d {data}',
        params: [
            { id: 'data', label: 'Dati (hex)', type: 'text', placeholder: 'AABBCCDD', mono: true },
        ],
        tags: ['analyse', 'crc', 'checksum', 'lrc'],
    },
    {
        id: 'analyse-nuid', name: 'Info UID/NUID', icon: '🔢',
        category: 'analyse', subcategory: null,
        description: 'Analizza un UID MIFARE Classic e verifica se è un NUID (4 byte non unico).',
        pm3cmd: 'analyse nuid -d {uid}',
        params: [
            { id: 'uid', label: 'UID (8 hex = 4 byte)', type: 'text', placeholder: 'AABBCCDD', mono: true, maxlength: 8 },
        ],
        tags: ['analyse', 'uid', 'nuid'],
    },
    {
        id: 'data-plot', name: 'Visualizza segnale', icon: '📈',
        category: 'analyse', subcategory: null,
        description: 'Apre la finestra del grafico con il segnale RF campionato.',
        pm3cmd: 'data plot',
        params: [],
        tags: ['data', 'plot', 'graph', 'signal'],
    },
    {
        id: 'data-save', name: 'Salva trace', icon: '💾',
        category: 'analyse', subcategory: null,
        description: 'Salva la traccia RF corrente su file.',
        pm3cmd: 'data save -f {filename}',
        params: [
            { id: 'filename', label: 'Nome file', type: 'text', placeholder: 'trace', mono: true },
        ],
        tags: ['data', 'save', 'trace'],
    },
    {
        id: 'trace-list', name: 'Lista trace', icon: '📋',
        category: 'analyse', subcategory: null,
        description: 'Mostra la traccia di comunicazione RF decodeificata.',
        pm3cmd: 'trace list -1',
        params: [],
        tags: ['trace', 'list', 'communication'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  SMART CARD / EMV
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'smart-info', name: 'Info Smart Card', icon: '💳',
        category: 'smart', subcategory: null,
        description: 'Legge le informazioni di base da una smart card ISO 7816 nel lettore SAM.',
        pm3cmd: 'smart info',
        params: [],
        tags: ['smart', 'card', 'iso7816', 'info'],
    },
    {
        id: 'emv-scan', name: 'Scansione EMV (pagamento)', icon: '💳',
        category: 'smart', subcategory: null,
        description: 'Scansiona un tag/card per informazioni EMV (carte di pagamento contactless).',
        pm3cmd: 'emv scan -a',
        params: [],
        tags: ['emv', 'payment', 'scan', 'credit card'],
        featured: true,
    },
    {
        id: 'emv-extract', name: 'Estrai dati EMV', icon: '🏦',
        category: 'smart', subcategory: null,
        description: 'Estrae i dati pubblici da una carta di pagamento EMV contactless.',
        pm3cmd: 'emv scan -a -s -f {filename}',
        params: [
            { id: 'filename', label: 'File output (opz.)', type: 'text', placeholder: 'emv_data', mono: true },
        ],
        tags: ['emv', 'payment', 'extract'],
    },
];

// ─── Category metadata ────────────────────────────────────────────────────
const CATEGORIES = {
    auto: {
        label: 'Auto-Detection',
        icon: '🔍',
        description: 'Rileva automaticamente il tipo di tag',
        color: '#06b6d4',
    },
    hw: {
        label: 'Hardware',
        icon: '🖥',
        description: 'Comandi hardware e diagnostica',
        color: '#8b5cf6',
    },
    hf: {
        label: 'HF — Alta Frequenza',
        icon: '📶',
        description: '13.56 MHz — NFC, MIFARE, iClass, DESFire…',
        color: '#7c3aed',
        subcategories: {
            nfc:     { label: 'NFC / ISO 14443-A', icon: '📲' },
            mf:      { label: 'MIFARE Classic',    icon: '🃏' },
            mfu:     { label: 'MIFARE Ultralight / NTAG', icon: '📋' },
            desfire: { label: 'MIFARE DESFire',    icon: '🔐' },
            iclass:  { label: 'iClass / SEOS (HID)', icon: '🏢' },
            felica:  { label: 'FeliCa',             icon: '🇯🇵' },
            '15693': { label: 'ISO 15693',          icon: '📦' },
        },
    },
    lf: {
        label: 'LF — Bassa Frequenza',
        icon: '📻',
        description: '125 kHz / 134 kHz — EM410x, HID, T55xx…',
        color: '#059669',
        subcategories: {
            em410x: { label: 'EM410x (125 kHz)', icon: '📻' },
            hid:    { label: 'HID Proximity',    icon: '🏷' },
            t55xx:  { label: 'T55xx (riscrivibili)', icon: '🔄' },
        },
    },
    analyse: {
        label: 'Analisi & Dati',
        icon: '🧠',
        description: 'Analisi segnali, CRC, trace',
        color: '#d97706',
    },
    smart: {
        label: 'Smart Card / EMV',
        icon: '💳',
        description: 'ISO 7816, carte di pagamento EMV',
        color: '#0ea5e9',
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function getCommand(id) { return COMMANDS.find(c => c.id === id); }

function getCommandsByCategory(cat, subcat) {
    return COMMANDS.filter(c => c.category === cat && (subcat === undefined || c.subcategory === subcat));
}

function getFeaturedCommands() { return COMMANDS.filter(c => c.featured); }

function searchCommands(query) {
    const q = query.toLowerCase().trim();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c => {
        const en = (typeof i18n !== 'undefined' && i18n.COMMANDS_EN) ? i18n.COMMANDS_EN[c.id] : null;
        return (
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            (en && en.name && en.name.toLowerCase().includes(q)) ||
            (en && en.description && en.description.toLowerCase().includes(q)) ||
            c.tags.some(t => t.includes(q)) ||
            c.pm3cmd.includes(q)
        );
    });
}

function buildCommand(cmd, values) {
    let result = cmd.pm3cmd;
    for (const [k, v] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return result;
}

// Export
if (typeof module !== 'undefined') module.exports = { COMMANDS, CATEGORIES, getCommand, getCommandsByCategory, getFeaturedCommands, searchCommands, buildCommand };
