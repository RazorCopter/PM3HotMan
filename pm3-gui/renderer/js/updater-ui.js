// PM3 HotMan — Firmware updater UI
'use strict';

(() => {
    const api = window.pm3api;
    const el = id => document.getElementById(id);
    const dom = {
        button: el('btn-update'),
        overlay: el('update-overlay'),
        close: el('btn-update-close'),
        retry: el('btn-update-retry'),
        install: el('btn-update-install'),
        state: el('update-state'),
        stateIcon: el('update-state-icon'),
        stateTitle: el('update-state-title'),
        stateMessage: el('update-state-message'),
        grid: el('update-version-grid'),
        deviceVersion: el('update-device-version'),
        clientVersion: el('update-client-version'),
        officialVersion: el('update-official-version'),
        packageVersion: el('update-package-version'),
        hardware: el('update-hardware'),
        hardwareLabel: el('update-hardware-label'),
        variant: el('update-variant'),
        chooseVariant: el('btn-update-variant'),
        notice: el('update-notice'),
        progress: el('update-progress'),
        progressLabel: el('update-progress-label'),
        progressValue: el('update-progress-value'),
        progressBar: el('update-progress-bar'),
        log: el('update-log'),
        consentWrap: el('update-consent-wrap'),
        consent: el('update-consent'),
    };

    let token = null;
    let checkData = null;
    let busy = false;
    let protectedPhase = false;

    function setState(kind, title, message, icon) {
        dom.state.className = `update-state ${kind}`;
        dom.stateTitle.textContent = title;
        dom.stateMessage.textContent = message;
        dom.stateIcon.textContent = icon;
    }

    function setNotice(message, type = 'info') {
        dom.notice.textContent = message || '';
        dom.notice.className = `update-notice ${type}${message ? '' : ' hidden'}`;
    }

    function reset() {
        token = null;
        checkData = null;
        busy = false;
        protectedPhase = false;
        dom.button.disabled = false;
        dom.close.disabled = false;
        dom.retry.disabled = false;
        dom.install.disabled = true;
        dom.grid.classList.add('hidden');
        dom.hardware.classList.add('hidden');
        dom.progress.classList.add('hidden');
        dom.consentWrap.classList.add('hidden');
        dom.consent.checked = false;
        dom.log.textContent = '';
        dom.progressBar.style.width = '0%';
        dom.progressValue.textContent = '0%';
        setNotice('');
        const chkTitle = typeof i18n !== 'undefined' ? i18n.t('updater.checking_title') : 'Controllo in corso';
        const chkDesc = typeof i18n !== 'undefined' ? i18n.t('updater.checking_desc') : 'Lettura della versione installata…';
        setState('checking', chkTitle, chkDesc, '↻');
    }

    function setBusy(value) {
        busy = value;
        dom.button.disabled = value;
        dom.retry.disabled = value;
        dom.chooseVariant.disabled = value;
        dom.close.disabled = value || protectedPhase;
    }

    function open() {
        reset();
        dom.overlay.classList.remove('hidden');
        runCheck();
    }

    function close() {
        if (busy || protectedPhase) return;
        dom.overlay.classList.add('hidden');
    }

    function formatDate(compact) {
        if (!/^\d{8}$/.test(compact || '')) return compact || '—';
        return `${compact.slice(6, 8)}/${compact.slice(4, 6)}/${compact.slice(0, 4)}`;
    }

    function renderCheck(check) {
        checkData = check;
        dom.grid.classList.remove('hidden');
        dom.hardware.classList.remove('hidden');
        const notDet = typeof i18n !== 'undefined' ? i18n.t('updater.not_detected') : 'Non rilevato';
        dom.deviceVersion.textContent = check.device.firmware || notDet;
        dom.clientVersion.textContent = check.localClient || notDet;
        dom.officialVersion.textContent = check.official.tag || '—';
        dom.hardwareLabel.textContent = `${check.device.hardware}${check.device.flashKb ? ` · ${check.device.flashKb} KB` : ''}`;

        if (check.variant) dom.variant.value = check.variant;
        dom.chooseVariant.classList.toggle('hidden', !check.requiresVariant);

        if (check.package) {
            dom.packageVersion.textContent = `${check.package.commit.slice(0, 9)} · ${formatDate(check.package.buildDate)}`;
        } else {
            dom.packageVersion.textContent = typeof i18n !== 'undefined' ? i18n.t('updater.select_hw') : 'Seleziona hardware';
        }

        if (check.requiresVariant) {
            setState('warning', typeof i18n !== 'undefined' ? i18n.t('updater.confirm_model') : 'Conferma il modello', typeof i18n !== 'undefined' ? i18n.t('updater.confirm_model_msg') : 'Il tipo di Proxmark3 non è identificabile con certezza.', '!');
            setNotice(typeof i18n !== 'undefined' ? i18n.t('updater.confirm_model_notice') : 'Scegli la variante corretta: un firmware RDV4 non deve essere installato su un Proxmark3 Easy/Generic.', 'error');
            return;
        }
        if (check.blockedReason) {
            setState('error', typeof i18n !== 'undefined' ? i18n.t('updater.blocked_title') : 'Aggiornamento automatico bloccato', check.blockedReason, '×');
            setNotice(check.blockedReason, 'error');
            return;
        }
        if (check.packageUpdateAvailable) {
            setState('success', typeof i18n !== 'undefined' ? i18n.t('updater.available_title') : 'Aggiornamento disponibile', typeof i18n !== 'undefined' ? i18n.t('updater.available_msg') : 'Il pacchetto Windows è più recente del firmware attivo.', '✓');
            dom.consentWrap.classList.remove('hidden');
            if (check.packageBehindOfficial) {
                setNotice(typeof i18n !== 'undefined' ? i18n.t('updater.behind_official', { tag: check.official.tag, commit: check.package.commit.slice(0, 9) }) : `Il tag ufficiale ${check.official.tag} è più recente della build Windows disponibile. Verrà installata la build verificata ${check.package.commit.slice(0, 9)}; potrai ricontrollare quando il pacchetto del nuovo tag sarà pubblicato.`, 'info');
            } else {
                setNotice(typeof i18n !== 'undefined' ? i18n.t('updater.standard_notice') : 'Bootloader, full image e client verranno aggiornati come un unico set compatibile.', 'info');
            }
            dom.install.disabled = !dom.consent.checked;
            return;
        }
        if (check.officialUpdateAvailable && check.packageBehindOfficial) {
            setState('warning', typeof i18n !== 'undefined' ? i18n.t('updater.waiting_win_title') : 'Build Windows in attesa', typeof i18n !== 'undefined' ? i18n.t('updater.waiting_win_msg', { tag: check.official.tag }) : `Il tag ${check.official.tag} esiste, ma il relativo pacchetto Windows non è ancora disponibile.`, '!');
            setNotice(typeof i18n !== 'undefined' ? i18n.t('updater.waiting_win_notice') : 'Nessun flash verrà eseguito finché non sarà disponibile un pacchetto Windows verificabile e più recente.', 'info');
            return;
        }
        setState('success', typeof i18n !== 'undefined' ? i18n.t('updater.up_to_date_title') : 'Proxmark3 aggiornato', typeof i18n !== 'undefined' ? i18n.t('updater.up_to_date_msg') : 'Firmware e pacchetto Windows disponibile risultano allineati.', '✓');
        setNotice(typeof i18n !== 'undefined' ? i18n.t('updater.no_flash_needed') : 'Non è necessario eseguire alcun flash.', 'info');
    }

    async function runCheck(variant) {
        setBusy(true);
        dom.install.disabled = true;
        dom.progress.classList.add('hidden');
        dom.consentWrap.classList.add('hidden');
        setNotice('');
        setState('checking', typeof i18n !== 'undefined' ? i18n.t('updater.checking_title') : 'Controllo in corso', typeof i18n !== 'undefined' ? i18n.t('updater.querying_desc') : 'Interrogazione del dispositivo e del repository RRG…', '↻');
        const result = await api.checkUpdate(variant);
        setBusy(false);
        if (!result.success) {
            setState('error', typeof i18n !== 'undefined' ? i18n.t('updater.check_failed') : 'Controllo non riuscito', result.error, '×');
            setNotice(result.error, 'error');
            return;
        }
        token = result.token;
        renderCheck(result.check);
    }

    function updateProgress(info) {
        if (!info || dom.overlay.classList.contains('hidden')) return;
        const phase = info.phase || '';
        protectedPhase = phase === 'flashing' || phase === 'verifying';
        if (busy) dom.close.disabled = true;

        const labels = typeof i18n !== 'undefined' ? {
            download: i18n.t('updater.phase_download'),
            'verify-download': i18n.t('updater.phase_verify_download'),
            extract: i18n.t('updater.phase_extract'),
            flashing: i18n.t('updater.phase_flashing'),
            verifying: i18n.t('updater.phase_verifying'),
            complete: i18n.t('updater.phase_complete'),
            failed: i18n.t('updater.phase_failed'),
        } : {
            download: 'Download pacchetto Windows',
            'verify-download': 'Verifica SHA-256',
            extract: 'Estrazione sicura',
            flashing: 'Scrittura firmware',
            verifying: 'Verifica dispositivo',
            complete: 'Completato',
            failed: 'Operazione non riuscita',
        };
        let percent = Number.isFinite(info.percent) ? info.percent : null;
        if (phase === 'verify-download') percent = 48;
        if (phase === 'extract') percent = 56;
        if (phase === 'flashing') percent = 72;
        if (phase === 'verifying') percent = 92;
        if (phase === 'complete') percent = 100;

        dom.progress.classList.remove('hidden');
        const defaultPrep = typeof i18n !== 'undefined' ? i18n.t('updater.preparing') : 'Aggiornamento…';
        dom.progressLabel.textContent = info.message || labels[phase] || defaultPrep;
        if (percent !== null) {
            const bounded = Math.max(0, Math.min(100, percent));
            dom.progressBar.style.width = `${bounded}%`;
            dom.progressValue.textContent = `${bounded}%`;
        } else {
            dom.progressValue.textContent = '…';
        }

        if (protectedPhase) {
            setState('working', typeof i18n !== 'undefined' ? i18n.t('updater.protected_flash_title') : 'Flash protetto in corso', info.message || (typeof i18n !== 'undefined' ? i18n.t('updater.protected_flash_msg') : 'Non scollegare il dispositivo.'), '↻');
            setNotice(typeof i18n !== 'undefined' ? i18n.t('updater.protected_flash_notice') : 'Non chiudere l’app e non scollegare il cavo USB fino alla verifica finale.', 'error');
        }
    }

    function appendUpdateOutput(chunk) {
        if (!chunk) return;
        dom.log.textContent += String(chunk).replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
        if (dom.log.textContent.length > 120000) dom.log.textContent = dom.log.textContent.slice(-100000);
        dom.log.scrollTop = dom.log.scrollHeight;
    }

    async function startUpdate() {
        if (!token || !dom.consent.checked || busy) return;
        setBusy(true);
        dom.install.disabled = true;
        dom.retry.disabled = true;
        dom.variant.disabled = true;
        dom.progress.classList.remove('hidden');
        dom.log.textContent = '';
        setState('working', typeof i18n !== 'undefined' ? i18n.t('updater.start_prep') : 'Preparazione aggiornamento', typeof i18n !== 'undefined' ? i18n.t('updater.start_prep_msg') : 'Download e verifica del pacchetto…', '↻');
        setNotice(typeof i18n !== 'undefined' ? i18n.t('updater.verify_first_notice') : 'Il flash inizierà soltanto dopo la verifica completa del pacchetto.', 'info');

        const result = await api.startUpdate(token);
        busy = false;
        protectedPhase = false;
        dom.close.disabled = false;
        dom.button.disabled = false;
        dom.variant.disabled = false;
        dom.retry.disabled = false;
        if (!result.success) {
            setState('error', typeof i18n !== 'undefined' ? i18n.t('updater.update_failed_title') : 'Aggiornamento non completato', result.error, '×');
            const recovery = result.recoveryPath ? ` Pacchetto di recovery conservato in: ${result.recoveryPath}` : '';
            setNotice(`${result.error}${recovery}`, 'error');
            if (typeof showToast === 'function') showToast(typeof i18n !== 'undefined' ? i18n.t('updater.update_failed_toast') : 'Aggiornamento PM3 non completato.', 'error', 5000);
            return;
        }

        dom.progressBar.style.width = '100%';
        dom.progressValue.textContent = '100%';
        dom.deviceVersion.textContent = result.firmware || result.version;
        dom.clientVersion.textContent = result.version;
        setState('success', typeof i18n !== 'undefined' ? i18n.t('updater.update_success_title') : 'Aggiornamento completato', typeof i18n !== 'undefined' ? i18n.t('updater.update_success_msg', { version: result.version }) : `${result.version} installato e verificato sul dispositivo.`, '✓');
        setNotice(typeof i18n !== 'undefined' ? i18n.t('updater.update_success_notice', { sha256: result.sha256 }) : `Client attivato correttamente. SHA-256: ${result.sha256}`, 'info');
        dom.consentWrap.classList.add('hidden');
        if (typeof showToast === 'function') showToast(typeof i18n !== 'undefined' ? i18n.t('updater.update_success_toast', { version: result.version }) : `PM3 aggiornato a ${result.version}.`, 'success', 5000);
    }

    dom.button.addEventListener('click', open);
    dom.close.addEventListener('click', close);
    dom.retry.addEventListener('click', () => runCheck(checkData?.variant));
    dom.chooseVariant.addEventListener('click', () => runCheck(dom.variant.value));
    dom.install.addEventListener('click', startUpdate);
    dom.consent.addEventListener('change', () => {
        dom.install.disabled = !dom.consent.checked || !checkData?.packageUpdateAvailable || busy;
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !dom.overlay.classList.contains('hidden')) close();
    });
    api.onUpdateProgress(updateProgress);
    api.onUpdateOutput(appendUpdateOutput);

    window.pm3UpdaterUI = {
        isBusy: () => busy || protectedPhase,
    };
})();
