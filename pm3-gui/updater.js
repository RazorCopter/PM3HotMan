'use strict';

const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { execFile, spawn } = require('child_process');

const GITHUB_API = 'https://api.github.com/repos/RfidResearchGroup/proxmark3';
const PACKAGE_ENDPOINTS = {
    rrg_other: 'https://www.proxmarkbuilds.org/latest/rrg_other.php',
    rdv4: 'https://www.proxmarkbuilds.org/latest/rdv4.php',
    rdv4_bt: 'https://www.proxmarkbuilds.org/latest/rdv4_bt.php',
};
const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const VERSION_RE = /v4\.\d{4,}(?:-\d+-g[0-9a-f]{7,40})?/gi;

function stripAnsi(value) {
    return String(value || '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

function isAllowedHost(hostname) {
    const host = hostname.toLowerCase();
    return host === 'api.github.com' ||
        host === 'github.com' ||
        host === 'www.proxmarkbuilds.org' ||
        host === 'proxmarkbuilds.org' ||
        host.endsWith('.your-storagebox.de');
}

function requestStream(input, options = {}, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) return reject(new Error('Troppi reindirizzamenti durante il download.'));

        const parsed = new URL(input);
        if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
            return reject(new Error(`Destinazione di aggiornamento non consentita: ${parsed.hostname}`));
        }

        const username = decodeURIComponent(parsed.username || '');
        const password = decodeURIComponent(parsed.password || '');
        parsed.username = '';
        parsed.password = '';

        const headers = {
            'User-Agent': 'PM3-HotMan-Updater',
            ...options.headers,
        };
        if (username) {
            headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        }

        const req = https.request(parsed, {
            method: options.method || 'GET',
            headers,
        }, response => {
            const status = response.statusCode || 0;
            if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
                response.resume();
                const next = new URL(response.headers.location, parsed).toString();
                resolve(requestStream(next, options, redirects + 1));
                return;
            }
            response.setTimeout(options.bodyTimeout || 45000, () => {
                response.destroy(new Error('Timeout durante il trasferimento.'));
            });
            resolve({ response, finalUrl: parsed.toString() });
        });

        req.setTimeout(options.timeout || 20000, () => {
            req.destroy(new Error('Timeout durante la connessione al server di aggiornamento.'));
        });
        req.on('error', reject);
        req.end();
    });
}

async function readResponseBody(response, maxBytes = MAX_JSON_BYTES) {
    const chunks = [];
    let total = 0;
    for await (const chunk of response) {
        total += chunk.length;
        if (total > maxBytes) throw new Error('Risposta del server troppo grande.');
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

async function requestJson(url) {
    const { response } = await requestStream(url, {
        headers: { Accept: 'application/vnd.github+json' },
    });
    if (response.statusCode !== 200) {
        response.resume();
        throw new Error(`GitHub ha risposto con HTTP ${response.statusCode}.`);
    }
    return JSON.parse(await readResponseBody(response));
}

function normalizeVersion(value) {
    const match = String(value || '').match(VERSION_RE);
    return match ? match[0].toLowerCase().replace(/^v/, 'v') : null;
}

function versionParts(value) {
    const normalized = normalizeVersion(value);
    if (!normalized) return null;
    const match = normalized.match(/^v4\.(\d+)(?:-(\d+)-g([0-9a-f]+))?$/i);
    if (!match) return null;
    return {
        value: normalized,
        release: Number(match[1]),
        distance: Number(match[2] || 0),
        commit: match[3] || null,
        tag: `v4.${match[1]}`,
    };
}

function compareVersionStrings(left, right) {
    const a = versionParts(left);
    const b = versionParts(right);
    if (!a || !b) return 0;
    if (a.release !== b.release) return Math.sign(a.release - b.release);
    return Math.sign(a.distance - b.distance);
}

function readClientVersion(executablePath) {
    const binary = fs.readFileSync(executablePath).toString('latin1');
    const versions = binary.match(VERSION_RE) || [];
    if (!versions.length) return null;
    versions.sort((a, b) => {
        const byVersion = compareVersionStrings(b, a);
        if (byVersion !== 0) return byVersion;
        return b.length - a.length;
    });
    return normalizeVersion(versions[0]);
}

function inspectDeviceOutput(rawOutput) {
    const output = stripAnsi(rawOutput);
    const lines = output.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const findVersion = regex => {
        const line = lines.find(item => regex.test(item));
        return line ? normalizeVersion(line) : null;
    };
    const versions = output.match(VERSION_RE) || [];

    const client = findVersion(/\bclient\b/i);
    const bootloader = findVersion(/\bbootrom\b|\bbootloader\b/i);
    let firmware = findVersion(/(?:^|\s)(?:os|firmware)(?:\s|\.|:)/i);
    if (!firmware) {
        const candidates = versions.map(normalizeVersion).filter(Boolean);
        firmware = candidates.find(value => value !== client && value !== bootloader) || candidates[0] || null;
    }

    const flashMatch = output.match(/AT91SAM7S(256|512)/i) || output.match(/(?:flash|memory)[^\n]*(256|512)\s*(?:KB|KiB)/i);
    const flashKb = flashMatch ? Number(flashMatch[1]) : null;
    let variant = null;
    let hardware = 'Non determinato';
    if (/BTADDON|BlueShark/i.test(output)) {
        variant = 'rdv4_bt';
        hardware = 'Proxmark3 RDV4 + BlueShark';
    } else if (/PM3\s*RDV4|Proxmark3\s*RDV4|\bRDV4\b/i.test(output)) {
        variant = 'rdv4';
        hardware = 'Proxmark3 RDV4';
    } else if (/PM3\s*GENERIC|Proxmark3\s*Easy|\bRDV[123]\b|AT91SAM7S(?:256|512)/i.test(output)) {
        variant = 'rrg_other';
        hardware = /Easy/i.test(output) ? 'Proxmark3 Easy / Generic' : 'Proxmark3 Generic';
    }

    return {
        client,
        firmware,
        bootloader,
        hardware,
        variant,
        flashKb,
        raw: output,
    };
}

function githubRefForVersion(version) {
    const parts = versionParts(version);
    if (!parts) return null;
    return parts.commit || parts.tag;
}

async function getLatestOfficialRelease() {
    const release = await requestJson(`${GITHUB_API}/releases/latest`);
    return {
        tag: release.tag_name,
        name: release.name || release.tag_name,
        publishedAt: release.published_at,
        url: release.html_url,
    };
}

async function resolveLatestPackage(variant) {
    const endpoint = PACKAGE_ENDPOINTS[variant];
    if (!endpoint) throw new Error('Variante hardware non supportata.');
    const { response, finalUrl } = await requestStream(endpoint, { method: 'HEAD' });
    if (response.statusCode !== 200) {
        response.resume();
        throw new Error(`Il server dei binari ha risposto con HTTP ${response.statusCode}.`);
    }
    response.resume();
    const filename = decodeURIComponent(new URL(finalUrl).pathname.split('/').pop() || '');
    const match = filename.match(/-(\d{8})-([0-9a-f]{40})\.7z$/i);
    if (!match) throw new Error('Il pacchetto Windows non espone data e commit attesi.');
    const size = Number(response.headers['content-length'] || 0);
    if (size <= 0 || size > MAX_ARCHIVE_BYTES) throw new Error('Dimensione del pacchetto non valida.');
    return {
        variant,
        endpoint,
        filename,
        buildDate: match[1],
        commit: match[2].toLowerCase(),
        size,
    };
}

async function compareRefs(base, head) {
    if (!base || !head) return null;
    const result = await requestJson(`${GITHUB_API}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`);
    return {
        status: result.status,
        aheadBy: result.ahead_by,
        behindBy: result.behind_by,
        totalCommits: result.total_commits,
    };
}

async function checkForUpdate({ deviceOutput, clientPath, variantOverride }) {
    const device = inspectDeviceOutput(deviceOutput);
    const localClient = readClientVersion(clientPath);
    const official = await getLatestOfficialRelease();
    const variant = variantOverride || device.variant;
    const currentVersion = device.firmware || localClient;
    const result = {
        checkedAt: new Date().toISOString(),
        device: { ...device, raw: undefined },
        localClient,
        currentVersion,
        official,
        variant,
        requiresVariant: !variant,
        package: null,
        officialUpdateAvailable: compareVersionStrings(official.tag, currentVersion) > 0,
        packageUpdateAvailable: false,
        packageBehindOfficial: false,
        blockedReason: null,
    };

    if (device.flashKb === 256) {
        result.blockedReason = 'Il dispositivo usa 256 KB di flash: il firmware RRG completo non può essere installato automaticamente.';
    }
    if (!variant) return result;

    const packageInfo = await resolveLatestPackage(variant);
    const commitInfo = await requestJson(`${GITHUB_API}/commits/${packageInfo.commit}`);
    if (!commitInfo.sha || !commitInfo.sha.toLowerCase().startsWith(packageInfo.commit)) {
        throw new Error('Il commit del pacchetto non appartiene al repository RRG ufficiale.');
    }

    const currentRef = githubRefForVersion(currentVersion || localClient);
    let packageComparison = null;
    let officialComparison = null;
    try {
        packageComparison = await compareRefs(currentRef, packageInfo.commit);
    } catch (_) {}
    try {
        officialComparison = await compareRefs(packageInfo.commit, official.tag);
    } catch (_) {}

    result.package = {
        variant,
        filename: packageInfo.filename,
        buildDate: packageInfo.buildDate,
        commit: packageInfo.commit,
        size: packageInfo.size,
        source: 'proxmarkbuilds.org',
        comparison: packageComparison,
    };
    result.packageUpdateAvailable = !result.blockedReason && packageComparison?.status === 'ahead';
    result.packageBehindOfficial = officialComparison?.status === 'ahead';
    result._packageEndpoint = packageInfo.endpoint;
    return result;
}

function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

async function downloadFile(url, destination, onProgress) {
    const { response } = await requestStream(url, { bodyTimeout: 60000 });
    if (response.statusCode !== 200) {
        response.resume();
        throw new Error(`Download non riuscito: HTTP ${response.statusCode}.`);
    }
    const total = Number(response.headers['content-length'] || 0);
    if (total <= 0 || total > MAX_ARCHIVE_BYTES) {
        response.destroy();
        throw new Error('Dimensione del download non valida.');
    }

    await new Promise((resolve, reject) => {
        let received = 0;
        const output = fs.createWriteStream(destination, { flags: 'wx' });
        const fail = error => {
            response.destroy();
            output.destroy();
            try { fs.unlinkSync(destination); } catch (_) {}
            reject(error);
        };
        response.on('data', chunk => {
            received += chunk.length;
            if (received > MAX_ARCHIVE_BYTES) return fail(new Error('Il download supera il limite consentito.'));
            onProgress?.({ received, total, percent: Math.round((received / total) * 100) });
        });
        response.on('error', fail);
        output.on('error', fail);
        output.on('finish', () => output.close(resolve));
        response.pipe(output);
    });
}

function execFilePromise(file, args, options = {}) {
    return new Promise((resolve, reject) => {
        execFile(file, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
            if (error) {
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}

function validateArchiveEntries(listing) {
    const entries = listing.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    for (const entry of entries) {
        const normalized = entry.replace(/\\/g, '/');
        if (normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || normalized.split('/').includes('..')) {
            throw new Error(`Percorso non sicuro nel pacchetto: ${entry}`);
        }
    }
    const required = [
        'client/proxmark3.exe',
        'client/bootrom.elf',
        'client/fullimage.elf',
        'client/pm3-flash-all',
        'pm3-flash-all.bat',
    ];
    for (const expected of required) {
        if (!entries.some(entry => entry.replace(/\\/g, '/') === expected)) {
            throw new Error(`File obbligatorio assente dal pacchetto: ${expected}`);
        }
    }
    return entries;
}

function safeRemoveStaging(target, engineRoot) {
    const root = path.resolve(engineRoot);
    const resolved = path.resolve(target);
    if (path.dirname(resolved) !== root || !path.basename(resolved).startsWith('.staging-')) {
        throw new Error('Rifiutata la rimozione di una cartella non temporanea.');
    }
    fs.rmSync(resolved, { recursive: true, force: true });
}

async function preparePackage({ engineRoot, packageInfo, endpoint, onProgress }) {
    fs.mkdirSync(engineRoot, { recursive: true });
    const stageDir = path.join(engineRoot, `.staging-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
    const archivePath = path.join(stageDir, 'package.7z');
    const packageRoot = path.join(stageDir, 'package');
    fs.mkdirSync(packageRoot, { recursive: true });

    try {
        await downloadFile(endpoint, archivePath, progress => onProgress?.({ phase: 'download', ...progress }));
        onProgress?.({ phase: 'verify-download', message: 'Calcolo impronta SHA-256…' });
        const sha256 = await hashFile(archivePath);
        const { stdout } = await execFilePromise('tar.exe', ['-tf', archivePath]);
        validateArchiveEntries(stdout);
        onProgress?.({ phase: 'extract', message: 'Estrazione e verifica del pacchetto…' });
        await execFilePromise('tar.exe', ['-xf', archivePath, '-C', packageRoot]);

        const clientPath = path.join(packageRoot, 'client', 'proxmark3.exe');
        const bootromPath = path.join(packageRoot, 'client', 'bootrom.elf');
        const fullimagePath = path.join(packageRoot, 'client', 'fullimage.elf');
        for (const [file, minimum] of [[clientPath, 1024 * 1024], [bootromPath, 4096], [fullimagePath, 100000]]) {
            if (!fs.existsSync(file) || fs.statSync(file).size < minimum) {
                throw new Error(`File estratto non valido: ${path.basename(file)}`);
            }
        }

        const version = readClientVersion(clientPath);
        const embeddedCommit = versionParts(version)?.commit;
        if (!embeddedCommit || !packageInfo.commit.startsWith(embeddedCommit)) {
            throw new Error('La versione incorporata nel client non corrisponde al commit dichiarato dal pacchetto.');
        }
        return { stageDir, archivePath, packageRoot, clientPath, version, sha256 };
    } catch (error) {
        safeRemoveStaging(stageDir, engineRoot);
        throw error;
    }
}

function runFlashScript({ clientDir, script, port, env, onOutput, onProcess, killTree, timeoutMs = 12 * 60 * 1000 }) {
    return new Promise((resolve, reject) => {
        const bashPath = path.join(clientDir, 'libs', 'shell', 'bash.exe');
        const scriptPath = path.join(clientDir, script);
        if (!fs.existsSync(bashPath) || !fs.existsSync(scriptPath)) {
            reject(new Error(`Script di flash non disponibile: ${script}`));
            return;
        }

        let output = '';
        let settled = false;
        // Match the official .bat wrappers: let the RRG script detect the USB port.
        // This preserves its outdated-bootloader safety check on Windows.
        const proc = spawn(bashPath, [script], {
            cwd: clientDir,
            env,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        onProcess?.(proc);

        const consume = chunk => {
            const text = chunk.toString();
            output += text;
            if (output.length > 2 * 1024 * 1024) output = output.slice(-2 * 1024 * 1024);
            onOutput?.(text);
        };
        proc.stdout.on('data', consume);
        proc.stderr.on('data', consume);
        proc.on('error', error => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            onProcess?.(null);
            reject(error);
        });
        proc.on('exit', code => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            onProcess?.(null);
            resolve({ code, output: stripAnsi(output) });
        });

        const timer = setTimeout(async () => {
            if (settled) return;
            settled = true;
            try { await killTree?.(proc); } catch (_) {}
            onProcess?.(null);
            reject(new Error(`Timeout durante ${script}.`));
        }, timeoutMs);
    });
}

async function flashPackage(options) {
    const clientDir = path.join(options.packageRoot, 'client');
    const run = async (script, label) => {
        options.onPhase?.(label);
        const result = await runFlashScript({ ...options, clientDir, script });
        return result;
    };

    const all = await run('pm3-flash-all', 'Flash bootloader e full image…');
    if (all.code === 0) return { mode: 'all', output: all.output };

    if (!/outdated bootloader|use pm3-flash-bootrom first|bootloader does not understand/i.test(all.output)) {
        throw new Error(`pm3-flash-all terminato con codice ${all.code}.`);
    }

    options.onOutput?.('\n[!] Bootloader datato: eseguo prima il bootloader e poi la full image.\n');
    const bootrom = await run('pm3-flash-bootrom', 'Aggiornamento bootloader…');
    if (bootrom.code !== 0) throw new Error(`pm3-flash-bootrom terminato con codice ${bootrom.code}.`);
    const fullimage = await run('pm3-flash-fullimage', 'Aggiornamento full image…');
    if (fullimage.code !== 0) throw new Error(`pm3-flash-fullimage terminato con codice ${fullimage.code}.`);
    return { mode: 'split', output: `${bootrom.output}\n${fullimage.output}` };
}

function activatePackage({ engineRoot, prepared, packageInfo }) {
    const safeVersion = prepared.version.replace(/[^a-z0-9._-]/gi, '_');
    const directoryName = `engine-${safeVersion}-${prepared.sha256.slice(0, 8)}`;
    const destination = path.join(engineRoot, directoryName);
    if (!fs.existsSync(destination)) fs.renameSync(prepared.packageRoot, destination);

    const manifest = {
        version: prepared.version,
        commit: packageInfo.commit,
        variant: packageInfo.variant,
        sha256: prepared.sha256,
        engineDir: directoryName,
        installedAt: new Date().toISOString(),
    };
    const currentPath = path.join(engineRoot, 'current.json');
    const nextPath = path.join(engineRoot, 'current.json.next');
    const backupPath = path.join(engineRoot, 'current.json.bak');
    fs.writeFileSync(nextPath, JSON.stringify(manifest, null, 2), 'utf8');
    try {
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        if (fs.existsSync(currentPath)) fs.renameSync(currentPath, backupPath);
        fs.renameSync(nextPath, currentPath);
    } catch (error) {
        if (!fs.existsSync(currentPath) && fs.existsSync(backupPath)) fs.renameSync(backupPath, currentPath);
        throw error;
    }
    safeRemoveStaging(prepared.stageDir, engineRoot);
    return { manifest, clientPath: path.join(destination, 'client', 'proxmark3.exe') };
}

function getActiveClientPath(engineRoot) {
    try {
        const manifest = JSON.parse(fs.readFileSync(path.join(engineRoot, 'current.json'), 'utf8'));
        if (!/^[a-z0-9._-]+$/i.test(manifest.engineDir || '')) return null;
        const clientPath = path.join(engineRoot, manifest.engineDir, 'client', 'proxmark3.exe');
        return fs.existsSync(clientPath) ? clientPath : null;
    } catch (_) {
        return null;
    }
}

module.exports = {
    PACKAGE_ENDPOINTS,
    activatePackage,
    checkForUpdate,
    compareVersionStrings,
    flashPackage,
    getActiveClientPath,
    inspectDeviceOutput,
    preparePackage,
    readClientVersion,
    resolveLatestPackage,
    safeRemoveStaging,
    versionParts,
};
