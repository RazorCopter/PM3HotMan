# PM3 HotMan GUI

GUI desktop premium per Windows che wrappa il client `pm3.exe` di **Proxmark3 (Iceman Fork)**.

## Prerequisiti

- **Node.js** (v18+): https://nodejs.org/
- **pm3.exe** compilato (dal repo principale oppure da https://www.proxmarkbuilds.org/)

## Setup e avvio

```powershell
cd pm3-gui
npm install
npm start
```

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
