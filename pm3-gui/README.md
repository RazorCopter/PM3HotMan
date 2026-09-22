# PM3 HotMan GUI

GUI desktop premium per Windows e Linux che wrappa il client `proxmark3` di **Proxmark3 (Iceman Fork)**.

## Prerequisiti

- **Node.js** (v18+): https://nodejs.org/
- **Client Proxmark3 compilato**:
  - Su **Windows**: binario `proxmark3.exe` (incluso nel bundle o da https://www.proxmarkbuilds.org/)
  - Su **Linux**: binario ELF nativo compilato con `make clean && make client` (o installato in `/usr/local/bin/proxmark3`)
- Su **Linux**: Permessi seriali concessi al proprio utente (`sudo usermod -aG dialout $USER` su Debian/Ubuntu/Kali o `sudo usermod -aG uucp $USER` su Arch/Fedora).

## Setup e avvio

```bash
cd pm3-gui
npm install
npm start
```

### Build eseguibili e installer

- **Windows (.exe installer)**: `npm run build`
- **Linux (AppImage / .deb)**: `npm run build:linux`

## Funzionalità

- Selezione porta COM con auto-scan
- Navigazione comandi per categoria (HF/LF/Hardware/Auto/EMV…)
- Form parametri user-friendly per ogni comando
- Output pm3 interpretato in card strutturate
- Terminale raw integrato con history e syntax coloring
- Arresto immediato dei comandi lunghi e dei relativi processi figli
- Aggiornamento coordinato di client, bootloader e full image dal pulsante `Aggiorna`
- Rilevamento automatico delle varianti Generic/Easy, RDV4 e RDV4 + BlueShark
- Verifica del commit RRG, SHA-256, struttura archivio e versione incorporata prima del flash
- Installazione versionata del nuovo client con attivazione solo dopo la verifica hardware finale
- Selettore lingua ITA / ENG istantaneo nella barra del titolo con salvataggio preferenza
- Ricerca globale comandi (Ctrl+K)

## Aggiornamento Proxmark3

Il controllo usa i tag del repository RRG ufficiale e i pacchetti Windows di Proxmarkbuilds. Se il pacchetto Windows è ancora precedente all'ultimo tag, la GUI lo dichiara esplicitamente e installa soltanto una build dimostrata più recente del firmware collegato.

Il flash richiama gli script ufficiali `pm3-flash-all`; se viene rilevato un bootloader datato, esegue in sequenza `pm3-flash-bootrom` e `pm3-flash-fullimage`. Durante la scrittura il comando Stop e la chiusura dell'app sono protetti per evitare interruzioni accidentali.

I client scaricati sono conservati in `%LOCALAPPDATA%\PM3HotMan\engines`. La cartella incorporata nell'installer rimane intatta come fallback.

## Struttura

```
pm3-gui/
├── main.js          ← Electron main process
├── preload.js       ← Context bridge IPC
├── renderer/
│   ├── index.html   ← Schermata connessione
│   ├── app.html     ← Dashboard principale
│   ├── css/         ← Design system + stili
│   └── js/          ← Logic: commands, parser, ui, terminal, app
└── assets/          ← Icone
```

## Build distribuzione (Windows .exe)

```powershell
npm install --save-dev @electron-forge/cli @electron-forge/maker-squirrel
npx electron-forge make
```

L'installer sarà in `out/make/`.
