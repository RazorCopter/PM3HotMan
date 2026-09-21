// PM3 HotMan — Internationalization (i18n) Module
// Complete translations for Italian and English
'use strict';

const i18n = (() => {
    let currentLang = localStorage.getItem('pm3_lang') || 'it';
    const listeners = [];

    const TRANSLATIONS = {
        it: {
            // Titlebar
            'titlebar.connecting': 'Connessione…',
            'titlebar.waiting_pm3': 'In attesa pm3…',
            'titlebar.connected': 'Connesso',
            'titlebar.disconnected': 'Disconnesso',
            'titlebar.reconnect': 'Riconnetti',
            'titlebar.disconnect': 'Disconnetti',
            'titlebar.disconnect_confirm': 'Disconnettersi dal Proxmark3?',
            'titlebar.search_placeholder': 'Cerca comando…',
            'titlebar.update': 'Aggiorna',
            'titlebar.update_tooltip': 'Verifica e aggiorna firmware, bootloader e client PM3',
            'titlebar.terminal_tooltip': 'Terminale raw',
            'titlebar.minimize_tooltip': 'Riduci a icona',
            'titlebar.maximize_tooltip': 'Massimizza',
            'titlebar.close_tooltip': 'Chiudi',

            // Sidebar
            'sidebar.quick': 'Rapido',
            'sidebar.home': 'Home',
            'sidebar.auto': 'Auto-Detection',
            'sidebar.recent': 'Usati di recente',
            'sidebar.hf': '📶 HF — 13.56 MHz',
            'sidebar.lf': '📻 LF — 125 kHz',
            'sidebar.other': 'Altro',
            'sidebar.hw': 'Hardware',
            'sidebar.analyse': 'Analisi & Dati',
            'sidebar.smart': 'Smart Card / EMV',

            // Home / Dashboard
            'home.title': 'Dashboard',
            'home.desc': "Seleziona un'operazione o esplora le categorie nella sidebar.",
            'home.hero_title': 'Proxmark3 connesso',
            'home.hero_desc': "Scegli un'operazione dalla lista o dalla sidebar. I comandi \"rapidi\" in verde permettono la rilevazione automatica dei tag.",
            'home.active_port': 'Porta attiva',
            'home.online': 'Online',
            'home.quick_actions': '⚡ Azioni rapide',
            'home.recently_used': '⏱ Usati di recente',
            'home.no_recent': 'Nessun comando usato finora.',
            'home.no_category_cmds': 'Nessun comando disponibile in questa categoria.',
            'recent.title': 'Usati di recente',
            'recent.desc': 'Gli ultimi comandi eseguiti.',

            // Command Detail View
            'detail.back': 'Indietro',
            'detail.title': 'Comando',
            'detail.cmd_badge': 'Comando Proxmark3:',
            'detail.run': 'Esegui',
            'detail.copy': 'Copia',
            'detail.copied': 'Copiato!',
            'detail.cmd_copied': 'Comando copiato!',
            'detail.no_params': 'Questo comando non richiede parametri.',
            'detail.press_run': 'Premi Esegui per lanciarlo.',
            'detail.browse': 'Sfoglia…',
            'detail.param_required': 'Il campo "{label}" è obbligatorio.',
            'detail.param_maxlength': 'Il campo "{label}" deve avere al massimo {max} caratteri.',
            'detail.card_warning': '⚠ Attenzione',

            // Output Panel
            'output.title': 'Output',
            'output.copy_tooltip': 'Copia output negli appunti',
            'output.clear_tooltip': 'Cancella output',
            'output.running': 'Comando in esecuzione…',
            'output.stop': 'Interrompi',
            'output.stopping': 'Arresto…',
            'output.stopped_msg': "[!] Comando interrotto dall'utente.",
            'output.stopped_toast': 'Comando interrotto.',
            'output.already_running': 'Un comando è già in esecuzione.',
            'output.cant_send': 'Impossibile inviare il comando. Il processo pm3 non è in esecuzione.',
            'output.long_running_warn': '[=] Comando ancora in esecuzione dopo 10 minuti. Puoi interromperlo con il pulsante Stop.',
            'output.process_closed': 'Il processo pm3 si è chiuso.',

            // Terminal
            'terminal.title': 'proxmark3 — Terminale raw',
            'terminal.resize_hint': 'trascina i bordi per ridimensionare',
            'terminal.stop': 'Stop',
            'terminal.placeholder': 'Digita un comando proxmark3…',
            'terminal.send': 'Invia',
            'terminal.already_running': '[!] Un altro comando è già in esecuzione.',
            'terminal.send_error': '[!] Errore invio: {err}',

            // Search
            'search.title': '{count} risultat{plural} per "{query}"',

            // Updater Dialog
            'updater.kicker': 'PM3 ENGINE CONTROL',
            'updater.title': 'Aggiornamento Proxmark3',
            'updater.subtitle': 'Verifica coordinata di client, firmware e bootloader.',
            'updater.checking_title': 'Controllo in corso',
            'updater.checking_desc': 'Lettura della versione installata…',
            'updater.querying_desc': 'Interrogazione del dispositivo e del repository RRG…',
            'updater.device_fw': 'Firmware dispositivo',
            'updater.active_client': 'Client attivo',
            'updater.latest_rrg': 'Ultimo tag RRG',
            'updater.win_build': 'Build Windows disponibile',
            'updater.not_detected': 'Non rilevato',
            'updater.select_hw': 'Seleziona hardware',
            'updater.detected_hw': 'Hardware rilevato',
            'updater.use_variant': 'Usa questa variante',
            'updater.confirm_model': 'Conferma il modello',
            'updater.confirm_model_msg': 'Il tipo di Proxmark3 non è identificabile con certezza.',
            'updater.confirm_model_notice': 'Scegli la variante corretta: un firmware RDV4 non deve essere installato su un Proxmark3 Easy/Generic.',
            'updater.blocked_title': 'Aggiornamento automatico bloccato',
            'updater.available_title': 'Aggiornamento disponibile',
            'updater.available_msg': 'Il pacchetto Windows è più recente del firmware attivo.',
            'updater.behind_official': 'Il tag ufficiale {tag} è più recente della build Windows disponibile. Verrà installata la build verificata {commit}; potrai ricontrollare quando il pacchetto del nuovo tag sarà pubblicato.',
            'updater.standard_notice': 'Bootloader, full image e client verranno aggiornati come un unico set compatibile.',
            'updater.waiting_win_title': 'Build Windows in attesa',
            'updater.waiting_win_msg': 'Il tag {tag} esiste, ma il relativo pacchetto Windows non è ancora disponibile.',
            'updater.waiting_win_notice': 'Nessun flash verrà eseguito finché non sarà disponibile un pacchetto Windows verificabile e più recente.',
            'updater.up_to_date_title': 'Proxmark3 aggiornato',
            'updater.up_to_date_msg': 'Firmware e pacchetto Windows disponibile risultano allineati.',
            'updater.no_flash_needed': 'Non è necessario eseguire alcun flash.',
            'updater.check_failed': 'Controllo non riuscito',
            'updater.preparing': 'Preparazione…',
            'updater.protected_flash_title': 'Flash protetto in corso',
            'updater.protected_flash_msg': 'Non scollegare il dispositivo.',
            'updater.protected_flash_notice': 'Non chiudere l’app e non scollegare il cavo USB fino alla verifica finale.',
            'updater.consent': 'Confermo che è l’unico Proxmark3 collegato, che resterà alimentato via USB e che non chiuderò l’app durante il flash.',
            'updater.source_hint': 'RRG ufficiale · pacchetto Windows Proxmarkbuilds',
            'updater.retry': 'Ricontrolla',
            'updater.install_now': 'Aggiorna ora',
            'updater.close': '✕',
            'updater.phase_download': 'Download pacchetto Windows',
            'updater.phase_verify_download': 'Verifica SHA-256',
            'updater.phase_extract': 'Estrazione sicura',
            'updater.phase_flashing': 'Scrittura firmware',
            'updater.phase_verifying': 'Verifica dispositivo',
            'updater.phase_complete': 'Completato',
            'updater.phase_failed': 'Operazione non riuscita',
            'updater.start_prep': 'Preparazione aggiornamento',
            'updater.start_prep_msg': 'Download e verifica del pacchetto…',
            'updater.verify_first_notice': 'Il flash inizierà soltanto dopo la verifica completa del pacchetto.',
            'updater.update_failed_title': 'Aggiornamento non completato',
            'updater.update_failed_toast': 'Aggiornamento PM3 non completato.',
            'updater.update_success_title': 'Aggiornamento completato',
            'updater.update_success_msg': '{version} installato e verificato sul dispositivo.',
            'updater.update_success_notice': 'Client attivato correttamente. SHA-256: {sha256}',
            'updater.update_success_toast': 'PM3 aggiornato a {version}.',

            // Connect Screen
            'connect.title': 'PM3 HotMan',
            'connect.subtitle': 'Proxmark3 GUI — Iceman Fork',
            'connect.pm3_path': 'Percorso proxmark3.exe',
            'connect.browse': 'Sfoglia…',
            'connect.com_port': 'Porta COM',
            'connect.scan': 'Aggiorna',
            'connect.scanning_ports': '— Scansione porte in corso… —',
            'connect.no_ports': '— Nessuna porta rilevata —',
            'connect.connect_btn': 'Connetti al Proxmark3',
            'connect.connecting_btn': 'Connessione in corso…',
            'connect.path_error': 'Specifica il percorso di proxmark3.exe',
            'connect.port_error': 'Seleziona una porta COM',
            'connect.starting_pm3': 'Avvio proxmark3.exe su {port}…',
            'connect.connected_msg': 'Connesso! (PID {pid}) Apertura dashboard…',
            'connect.path_ok': '✓ Eseguibile Proxmark3 riconosciuto',
            'connect.path_warn': 'Assicurati che sia proxmark3.exe (o pm3.exe)',
            'connect.badge_serial': 'Dispositivo seriale',

            // Parser Cards
            'parser.no_tag_title': 'Nessun tag rilevato',
            'parser.no_tag_text': "Avvicina il tag all'antenna del Proxmark3 e riprova.",
            'parser.auth_failed_title': 'Autenticazione fallita',
            'parser.auth_failed_text': 'La chiave specificata non è corretta per questo settore.',
            'parser.timeout_title': 'Timeout',
            'parser.timeout_text': 'Il dispositivo non ha risposto in tempo.',
            'parser.tag_detected': 'Tag rilevato',
            'parser.em410x_title': 'Tag EM410x',
            'parser.hid_title': 'Card HID Proximity',
            'parser.iclass_title': 'iClass CSN',
            'parser.keys_found_title': '{count} chiave/i trovata/e',
            'parser.keys_extracted_title': 'Chiavi estratte',
            'parser.blocks_title': 'Blocchi letti',
            'parser.antenna_title': 'Test Antenna',
            'parser.firmware_title': 'Firmware',
            'parser.autopwn_title': 'Autopwn completato con successo!',
            'parser.autopwn_text': 'Tutte le chiavi sono state recuperate. Controlla il file di dump generato.',
            'parser.saved_files_title': 'File Salvati',
            'parser.open_folder': 'Apri Cartella',
            'parser.field_type': 'Tipo',
            'parser.field_key_prefix': 'Chiave',
            'parser.field_keys': 'Chiavi',
            'parser.field_dump_bin': 'Dump Bin',
            'parser.field_dump_json': 'Dump JSON',
            'parser.field_version': 'Versione',
            'parser.table_blk': 'Blk',
            'parser.table_data': 'Dati (hex)',
            'parser.table_more': '… e altri {count} blocchi',
        },

        en: {
            // Titlebar
            'titlebar.connecting': 'Connecting…',
            'titlebar.waiting_pm3': 'Waiting for pm3…',
            'titlebar.connected': 'Connected',
            'titlebar.disconnected': 'Disconnected',
            'titlebar.reconnect': 'Reconnect',
            'titlebar.disconnect': 'Disconnect',
            'titlebar.disconnect_confirm': 'Disconnect from Proxmark3?',
            'titlebar.search_placeholder': 'Search command…',
            'titlebar.update': 'Update',
            'titlebar.update_tooltip': 'Check and update PM3 firmware, bootloader, and client',
            'titlebar.terminal_tooltip': 'Raw terminal',
            'titlebar.minimize_tooltip': 'Minimize',
            'titlebar.maximize_tooltip': 'Maximize',
            'titlebar.close_tooltip': 'Close',

            // Sidebar
            'sidebar.quick': 'Quick',
            'sidebar.home': 'Home',
            'sidebar.auto': 'Auto-Detection',
            'sidebar.recent': 'Recently Used',
            'sidebar.hf': '📶 HF — 13.56 MHz',
            'sidebar.lf': '📻 LF — 125 kHz',
            'sidebar.other': 'Other',
            'sidebar.hw': 'Hardware',
            'sidebar.analyse': 'Analysis & Data',
            'sidebar.smart': 'Smart Card / EMV',

            // Home / Dashboard
            'home.title': 'Dashboard',
            'home.desc': 'Select an operation or explore categories in the sidebar.',
            'home.hero_title': 'Proxmark3 Connected',
            'home.hero_desc': 'Choose an action from the list or sidebar. Green "quick" actions automatically detect tag types.',
            'home.active_port': 'Active Port',
            'home.online': 'Online',
            'home.quick_actions': '⚡ Quick Actions',
            'home.recently_used': '⏱ Recently Used',
            'home.no_recent': 'No commands used yet.',
            'home.no_category_cmds': 'No commands available in this category.',
            'recent.title': 'Recently Used',
            'recent.desc': 'Recently executed commands.',

            // Command Detail View
            'detail.back': 'Back',
            'detail.title': 'Command',
            'detail.cmd_badge': 'Proxmark3 Command:',
            'detail.run': 'Run',
            'detail.copy': 'Copy',
            'detail.copied': 'Copied!',
            'detail.cmd_copied': 'Command copied!',
            'detail.no_params': 'This command does not require parameters.',
            'detail.press_run': 'Press Run to execute.',
            'detail.browse': 'Browse…',
            'detail.param_required': 'The field "{label}" is required.',
            'detail.param_maxlength': 'The field "{label}" must have at most {max} characters.',
            'detail.card_warning': '⚠ Warning',

            // Output Panel
            'output.title': 'Output',
            'output.copy_tooltip': 'Copy output to clipboard',
            'output.clear_tooltip': 'Clear output',
            'output.running': 'Command running…',
            'output.stop': 'Stop',
            'output.stopping': 'Stopping…',
            'output.stopped_msg': '[!] Command interrupted by user.',
            'output.stopped_toast': 'Command stopped.',
            'output.already_running': 'A command is already running.',
            'output.cant_send': 'Cannot send command. The pm3 process is not running.',
            'output.long_running_warn': '[=] Command still running after 10 minutes. You can stop it with the Stop button.',
            'output.process_closed': 'The pm3 process has terminated.',

            // Terminal
            'terminal.title': 'proxmark3 — Raw Terminal',
            'terminal.resize_hint': 'drag borders to resize',
            'terminal.stop': 'Stop',
            'terminal.placeholder': 'Type a proxmark3 command…',
            'terminal.send': 'Send',
            'terminal.already_running': '[!] Another command is already running.',
            'terminal.send_error': '[!] Send error: {err}',

            // Search
            'search.title': '{count} result{plural} for "{query}"',

            // Updater Dialog
            'updater.kicker': 'PM3 ENGINE CONTROL',
            'updater.title': 'Proxmark3 Updater',
            'updater.subtitle': 'Coordinated check of client, firmware, and bootloader.',
            'updater.checking_title': 'Checking Status',
            'updater.checking_desc': 'Reading installed version…',
            'updater.querying_desc': 'Querying device and official RRG repository…',
            'updater.device_fw': 'Device Firmware',
            'updater.active_client': 'Active Client',
            'updater.latest_rrg': 'Latest RRG Tag',
            'updater.win_build': 'Available Windows Build',
            'updater.not_detected': 'Not detected',
            'updater.select_hw': 'Select hardware',
            'updater.detected_hw': 'Detected Hardware',
            'updater.use_variant': 'Use this variant',
            'updater.confirm_model': 'Confirm Model',
            'updater.confirm_model_msg': 'Proxmark3 model cannot be identified with certainty.',
            'updater.confirm_model_notice': 'Select the correct variant: RDV4 firmware must not be flashed onto a Generic/Easy Proxmark3.',
            'updater.blocked_title': 'Automatic Update Blocked',
            'updater.available_title': 'Update Available',
            'updater.available_msg': 'The Windows package is newer than the active firmware.',
            'updater.behind_official': 'Official tag {tag} is newer than the available Windows build. The verified build {commit} will be installed; check again when the new tag package is released.',
            'updater.standard_notice': 'Bootloader, full image, and client will be updated together as a compatible set.',
            'updater.waiting_win_title': 'Windows Build Pending',
            'updater.waiting_win_msg': 'Tag {tag} exists, but its Windows release package is not yet available.',
            'updater.waiting_win_notice': 'No flashing will occur until a newer, verified Windows package is ready.',
            'updater.up_to_date_title': 'Proxmark3 Up to Date',
            'updater.up_to_date_msg': 'Device firmware and available Windows build are aligned.',
            'updater.no_flash_needed': 'No flashing required.',
            'updater.check_failed': 'Check Failed',
            'updater.preparing': 'Preparing…',
            'updater.protected_flash_title': 'Protected Flash in Progress',
            'updater.protected_flash_msg': 'Do not disconnect the device.',
            'updater.protected_flash_notice': 'Do not close the app or unplug the USB cable until final verification is complete.',
            'updater.consent': 'I confirm this is the only connected Proxmark3, it will remain USB-powered, and I will not close the app during flashing.',
            'updater.source_hint': 'Official RRG · Windows package via Proxmarkbuilds',
            'updater.retry': 'Check Again',
            'updater.install_now': 'Update Now',
            'updater.close': '✕',
            'updater.phase_download': 'Downloading Windows package',
            'updater.phase_verify_download': 'Verifying SHA-256',
            'updater.phase_extract': 'Safe extraction',
            'updater.phase_flashing': 'Writing firmware',
            'updater.phase_verifying': 'Verifying device',
            'updater.phase_complete': 'Completed',
            'updater.phase_failed': 'Operation failed',
            'updater.start_prep': 'Preparing Update',
            'updater.start_prep_msg': 'Downloading and verifying package…',
            'updater.verify_first_notice': 'Flashing will only start after full package verification.',
            'updater.update_failed_title': 'Update Failed',
            'updater.update_failed_toast': 'PM3 update failed.',
            'updater.update_success_title': 'Update Completed',
            'updater.update_success_msg': '{version} installed and verified on device.',
            'updater.update_success_notice': 'Client activated successfully. SHA-256: {sha256}',
            'updater.update_success_toast': 'PM3 updated to {version}.',

            // Connect Screen
            'connect.title': 'PM3 HotMan',
            'connect.subtitle': 'Proxmark3 GUI — Iceman Fork',
            'connect.pm3_path': 'proxmark3.exe Path',
            'connect.browse': 'Browse…',
            'connect.com_port': 'COM Port',
            'connect.scan': 'Refresh',
            'connect.scanning_ports': '— Scanning ports… —',
            'connect.no_ports': '— No ports detected —',
            'connect.connect_btn': 'Connect to Proxmark3',
            'connect.connecting_btn': 'Connecting…',
            'connect.path_error': 'Specify the path to proxmark3.exe',
            'connect.port_error': 'Select a COM port',
            'connect.starting_pm3': 'Starting proxmark3.exe on {port}…',
            'connect.connected_msg': 'Connected! (PID {pid}) Opening dashboard…',
            'connect.path_ok': '✓ Valid Proxmark3 executable recognized',
            'connect.path_warn': 'Ensure it is proxmark3.exe (or pm3.exe)',
            'connect.badge_serial': 'Serial Device',

            // Parser Cards
            'parser.no_tag_title': 'No Tag Detected',
            'parser.no_tag_text': 'Place tag closer to the Proxmark3 antenna and try again.',
            'parser.auth_failed_title': 'Authentication Failed',
            'parser.auth_failed_text': 'The specified key is not correct for this sector.',
            'parser.timeout_title': 'Timeout',
            'parser.timeout_text': 'The device did not respond in time.',
            'parser.tag_detected': 'Tag Detected',
            'parser.em410x_title': 'EM410x Tag',
            'parser.hid_title': 'HID Proximity Card',
            'parser.iclass_title': 'iClass CSN',
            'parser.keys_found_title': '{count} key(s) found',
            'parser.keys_extracted_title': 'Extracted Keys',
            'parser.blocks_title': 'Blocks Read',
            'parser.antenna_title': 'Antenna Test',
            'parser.firmware_title': 'Firmware',
            'parser.autopwn_title': 'Autopwn Completed Successfully!',
            'parser.autopwn_text': 'All keys recovered. Inspect the generated dump file.',
            'parser.saved_files_title': 'Saved Files',
            'parser.open_folder': 'Open Folder',
            'parser.field_type': 'Type',
            'parser.field_key_prefix': 'Key',
            'parser.field_keys': 'Keys',
            'parser.field_dump_bin': 'Dump Bin',
            'parser.field_dump_json': 'Dump JSON',
            'parser.field_version': 'Version',
            'parser.table_blk': 'Blk',
            'parser.table_data': 'Data (hex)',
            'parser.table_more': '… and {count} more blocks',
        }
    };

    // Category translations
    const CATEGORIES_EN = {
        auto: {
            label: 'Auto-Detection',
            description: 'Automatically detects the tag type',
        },
        hw: {
            label: 'Hardware',
            description: 'Hardware and diagnostic commands',
        },
        hf: {
            label: 'HF — High Frequency',
            description: '13.56 MHz — NFC, MIFARE, iClass, DESFire…',
            subcategories: {
                nfc:     { label: 'NFC / ISO 14443-A' },
                mf:      { label: 'MIFARE Classic' },
                mfu:     { label: 'MIFARE Ultralight / NTAG' },
                desfire: { label: 'MIFARE DESFire' },
                iclass:  { label: 'iClass / SEOS (HID)' },
                felica:  { label: 'FeliCa' },
                '15693': { label: 'ISO 15693' },
            },
        },
        lf: {
            label: 'LF — Low Frequency',
            description: '125 kHz / 134 kHz — EM410x, HID, T55xx…',
            subcategories: {
                em410x: { label: 'EM410x (125 kHz)' },
                hid:    { label: 'HID Proximity' },
                t55xx:  { label: 'T55xx (Rewritable)' },
            },
        },
        analyse: {
            label: 'Analysis & Data',
            description: 'Signal analysis, CRC, traces',
        },
        smart: {
            label: 'Smart Card / EMV',
            description: 'ISO 7816, EMV payment cards',
        },
    };

    // Command English translations
    const COMMANDS_EN = {
        'hw-info': {
            name: 'Hardware Info',
            description: 'Displays detailed hardware info (firmware, FPGA, chip).',
        },
        'hw-ver': {
            name: 'Firmware Version',
            description: 'Shows firmware version and pm3 client build.',
        },
        'hw-tune': {
            name: 'Antenna Tune',
            description: 'Measures and tunes LF and HF antennas. Shows voltage curves.',
        },
        'hw-status': {
            name: 'Device Status',
            description: 'Shows current Proxmark3 status (flash, FPGA, USB).',
        },
        'hw-reset': {
            name: 'Reset Device',
            description: 'Reboots the Proxmark3 device.',
        },
        'hw-pingtime': {
            name: 'Ping Latency',
            description: 'Measures USB communication latency with Proxmark3.',
        },
        'auto': {
            name: 'Auto-detect Tag',
            description: 'Automatically detects tag type (HF and LF). Best starting command.',
        },
        'hf-search': {
            name: 'Search HF Tag',
            description: 'Searches for nearby High Frequency (13.56 MHz) tags.',
        },
        'lf-search': {
            name: 'Search LF Tag',
            description: 'Searches for nearby Low Frequency (125 kHz / 134 kHz) tags.',
        },
        'hf14a-scan': {
            name: 'Scan NFC Tag',
            description: 'Quickly scans all ISO 14443-A tags in range.',
        },
        'hf14a-info': {
            name: 'NFC Tag Info',
            description: 'Reads complete ISO 14443-A info (UID, ATQA, SAK, ATS).',
        },
        'hf14a-apdu': {
            name: 'Send Raw APDU',
            description: 'Sends a raw APDU frame to an ISO 14443-A tag.',
            params: {
                apdu: { label: 'APDU (hex)', hint: 'Hexadecimal sequence without spaces' },
            },
        },
        'hf14a-reader': {
            name: 'Reader Mode',
            description: 'Runs continuous reader mode to detect approaching tags.',
        },
        'hf-mf-info': {
            name: 'MIFARE Classic Info',
            description: 'Reads MIFARE Classic info: UID, type, and memory config.',
        },
        'hf-mf-autopwn': {
            name: 'Full Auto-Crack',
            description: 'Recovers all keys on MIFARE Classic with automated attacks (Hardnested, Darkside, etc.).',
        },
        'hf-mf-dump': {
            name: 'Full Dump',
            description: 'Downloads entire MIFARE Classic memory into a file.',
            params: {
                sectors: {
                    label: 'Sector Count',
                    options: {
                        '': 'Auto (1K/4K detected)',
                        '--1k': 'MIFARE 1K (16 sectors)',
                        '--2k': 'MIFARE 2K (32 sectors)',
                        '--4k': 'MIFARE 4K (40 sectors)',
                    },
                },
                filename: {
                    label: 'Output File Name',
                    hint: 'Without extension — .bin and .eml will be created',
                },
            },
        },
        'hf-mf-rdbl': {
            name: 'Read Block',
            description: 'Reads data from a single MIFARE Classic block.',
            params: {
                block: { label: 'Block Number', hint: '0–63 for MIFARE 1K, 0–255 for MIFARE 4K' },
                key: { label: 'Key (hex)', hint: '6 bytes = 12 hex characters' },
            },
        },
        'hf-mf-wrbl': {
            name: 'Write Block',
            description: 'Writes data to a single MIFARE Classic block.',
            params: {
                block: { label: 'Block Number' },
                key: { label: 'Key (hex)' },
                data: { label: 'Data (32 hex)', hint: '16 bytes = 32 hex characters' },
            },
        },
        'hf-mf-restore': {
            name: 'Restore Dump',
            description: 'Restores a previous dump back onto a MIFARE Classic or clone tag.',
            params: {
                sectors: {
                    label: 'Card Type',
                    options: {
                        '--1k': 'MIFARE 1K',
                        '--4k': 'MIFARE 4K',
                    },
                },
                filename: { label: 'Dump File' },
            },
        },
        'hf-mf-chk': {
            name: 'Crack Keys (Dictionary)',
            description: 'Tests default and dictionary keys against all sectors.',
        },
        'hf-mfu-info': {
            name: 'Ultralight/NTAG Info',
            description: 'Reads info from a MIFARE Ultralight or NTAG tag.',
        },
        'hf-mfu-dump': {
            name: 'Dump Ultralight',
            description: 'Downloads the entire memory of a MIFARE Ultralight / NTAG.',
            params: {
                filename: { label: 'Output File Name' },
            },
        },
        'hf-mfu-rdbl': {
            name: 'Read Page',
            description: 'Reads a single 4-byte page from a MIFARE Ultralight.',
            params: {
                page: { label: 'Page Number' },
            },
        },
        'hf-mfdes-info': {
            name: 'DESFire Info',
            description: 'Reads MIFARE DESFire tag info (UID, version, applications).',
        },
        'hf-mfdes-lsapp': {
            name: 'List Applications',
            description: 'Lists all applications installed on a DESFire card.',
        },
        'hf-mfdes-enum': {
            name: 'Enumerate All',
            description: 'Enumerates DESFire applications, files, and data using default authentication.',
        },
        'hf-iclass-info': {
            name: 'iClass Info',
            description: 'Reads HID iClass tag credentials and CSN.',
        },
        'hf-iclass-dump': {
            name: 'Dump iClass',
            description: 'Downloads HID iClass memory using the provided key.',
            params: {
                key: { label: 'Key (16 hex)', hint: '8 bytes = 16 hex characters' },
                filename: { label: 'Output File Name' },
            },
        },
        'hf-seos-info': {
            name: 'SEOS Info',
            description: 'Reads HID SEOS smart card parameters.',
        },
        'hf-felica-info': {
            name: 'FeliCa Info',
            description: 'Reads FeliCa tag info (commonly used in Japan transit/payments).',
        },
        'hf-felica-scan': {
            name: 'Scan FeliCa',
            description: 'Searches for nearby FeliCa tags.',
        },
        'hf15-info': {
            name: 'ISO 15693 Info',
            description: 'Reads ISO 15693 vicinity tag data.',
        },
        'hf15-scan': {
            name: 'Scan ISO 15693',
            description: 'Searches for nearby ISO 15693 tags.',
        },
        'hf15-dump': {
            name: 'Dump ISO 15693',
            description: 'Downloads full contents of an ISO 15693 tag.',
            params: {
                filename: { label: 'Output File Name' },
            },
        },
        'lf-em410x-read': {
            name: 'Read EM410x',
            description: 'Reads the ID of an EM410x tag (125 kHz). Most common LF tag.',
        },
        'lf-em410x-sim': {
            name: 'Simulate EM410x',
            description: 'Simulates an EM410x tag with the specified ID on Proxmark3.',
            params: {
                id: { label: 'Tag ID (10 hex)', hint: '5 bytes = 10 hex characters' },
            },
        },
        'lf-em410x-clone': {
            name: 'Clone to T55xx',
            description: 'Clones an EM410x ID onto a rewritable T55xx card.',
            params: {
                id: { label: 'Tag ID (10 hex)' },
            },
        },
        'lf-em410x-watch': {
            name: 'Watch EM410x',
            description: 'Continuous mode: reads and displays any EM410x tag brought near.',
        },
        'lf-hid-read': {
            name: 'Read HID Prox',
            description: 'Reads an HID Proximity card (26-bit, 35-bit, etc.).',
        },
        'lf-hid-sim': {
            name: 'Simulate HID Prox',
            description: 'Simulates an HID Proximity card with the specified raw code.',
            params: {
                rawcode: { label: 'Raw Code (hex)', hint: 'Use "Read HID" first to get raw code' },
            },
        },
        'lf-hid-clone': {
            name: 'Clone HID Prox',
            description: 'Clones an HID Proximity card onto a T55xx card.',
            params: {
                rawcode: { label: 'Raw Code (hex)' },
            },
        },
        'lf-t55xx-detect': {
            name: 'Detect T55xx',
            description: 'Detects and identifies a T55xx rewritable 125 kHz tag.',
        },
        'lf-t55xx-info': {
            name: 'T55xx Info',
            description: 'Reads and decodes configuration of a T55xx tag.',
        },
        'lf-t55xx-dump': {
            name: 'Dump T55xx',
            description: 'Reads all memory blocks of a T55xx tag.',
        },
        'lf-t55xx-wipe': {
            name: 'Wipe T55xx',
            description: 'Erases and resets a T55xx tag to factory defaults.',
        },
        'analyse-lcr': {
            name: 'Calculate LRC/CRC',
            description: 'Calculates LRC, CRC, and checksums over hex data.',
            params: {
                data: { label: 'Data (hex)' },
            },
        },
        'analyse-nuid': {
            name: 'UID/NUID Analysis',
            description: 'Analyzes a MIFARE Classic UID and checks for 4-byte NUID.',
            params: {
                uid: { label: 'UID (8 hex = 4 bytes)' },
            },
        },
        'data-plot': {
            name: 'Plot RF Signal',
            description: 'Opens waveform plotting window with sampled RF signal.',
        },
        'data-save': {
            name: 'Save Trace',
            description: 'Saves current RF trace buffer to file.',
            params: {
                filename: { label: 'File Name' },
            },
        },
        'trace-list': {
            name: 'Trace List',
            description: 'Displays decoded RF communication trace buffer.',
        },
        'smart-info': {
            name: 'Smart Card Info',
            description: 'Reads basic info from an ISO 7816 smart card in SAM slot.',
        },
        'emv-scan': {
            name: 'Scan EMV (Payment)',
            description: 'Scans for EMV contactless payment card details.',
        },
        'emv-extract': {
            name: 'Extract EMV Data',
            description: 'Extracts public cardholder records from contactless EMV card.',
            params: {
                filename: { label: 'Output File (opt.)' },
            },
        },
    };

    function getLang() {
        return currentLang;
    }

    function setLang(lang) {
        if (lang !== 'it' && lang !== 'en') return;
        currentLang = lang;
        localStorage.setItem('pm3_lang', lang);
        document.documentElement.lang = lang;
        applyDOM();
        updateSwitchers();
        for (const cb of listeners) {
            try { cb(lang); } catch (e) { console.error('i18n listener error', e); }
        }
    }

    function t(key, params = {}) {
        const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.it;
        let str = dict[key] || TRANSLATIONS.it[key] || key;
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }
        return str;
    }

    function onLanguageChange(cb) {
        if (typeof cb === 'function') listeners.push(cb);
    }

    function getLocalizedCommand(cmd) {
        if (!cmd) return null;
        if (currentLang === 'it') return cmd;
        const en = COMMANDS_EN[cmd.id];
        if (!en) return cmd;

        const localized = { ...cmd };
        if (en.name) localized.name = en.name;
        if (en.description) localized.description = en.description;

        if (en.params && cmd.params) {
            localized.params = cmd.params.map(p => {
                const ep = en.params[p.id];
                if (!ep) return p;
                const cloned = { ...p };
                if (ep.label) cloned.label = ep.label;
                if (ep.hint) cloned.hint = ep.hint;
                if (ep.placeholder) cloned.placeholder = ep.placeholder;
                if (ep.options && p.options) {
                    cloned.options = p.options.map(opt => ({
                        value: opt.value,
                        label: ep.options[opt.value] || opt.label,
                    }));
                }
                return cloned;
            });
        }
        return localized;
    }

    function getLocalizedCategory(catKey, subcatKey) {
        if (typeof CATEGORIES === 'undefined') return null;
        const cat = CATEGORIES[catKey];
        if (!cat) return null;
        if (currentLang === 'it') {
            if (subcatKey && cat.subcategories?.[subcatKey]) {
                return { label: cat.subcategories[subcatKey].label, description: cat.description };
            }
            return { label: cat.label, description: cat.description };
        }

        const enCat = CATEGORIES_EN[catKey];
        if (subcatKey) {
            const subLabel = enCat?.subcategories?.[subcatKey]?.label || cat.subcategories?.[subcatKey]?.label;
            return { label: subLabel || subcatKey, description: enCat?.description || cat.description };
        }
        return {
            label: enCat?.label || cat.label,
            description: enCat?.description || cat.description,
        };
    }

    function applyDOM(root = document) {
        // Elements with data-i18n (text content)
        root.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = t(key);
        });

        // Elements with data-i18n-html
        root.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.dataset.i18nHtml;
            el.innerHTML = t(key);
        });

        // Placeholders
        root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = t(key);
        });

        // Titles / tooltips
        root.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            el.title = t(key);
        });
    }

    function updateSwitchers() {
        document.querySelectorAll('.lang-switch').forEach(sw => {
            sw.querySelectorAll('.lang-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === currentLang);
            });
        });
    }

    function initSwitcher() {
        document.querySelectorAll('.lang-switch').forEach(sw => {
            sw.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    setLang(btn.dataset.lang);
                });
            });
        });
        updateSwitchers();
        document.documentElement.lang = currentLang;
    }

    // Auto-init when DOM ready
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', () => {
            initSwitcher();
            applyDOM();
        });
    }

    return {
        getLang,
        setLang,
        t,
        onLanguageChange,
        getLocalizedCommand,
        getLocalizedCategory,
        applyDOM,
        initSwitcher,
        COMMANDS_EN,
        CATEGORIES_EN,
    };
})();

if (typeof module !== 'undefined') {
    module.exports = i18n;
}
