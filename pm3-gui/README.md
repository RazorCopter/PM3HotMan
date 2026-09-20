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
- Ricerca globale comandi (Ctrl+K)

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
