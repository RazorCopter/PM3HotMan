<div align="center">
  <img src="docs/images/hero_banner.jpg" alt="PM3 HotMan Hero Banner" width="100%"/>
</div>

<div align="center">
  <img src="docs/images/icon.jpg" alt="PM3 HotMan Logo" width="120" style="border-radius:20px; margin-top:20px;"/>
  <h1>🔥 PM3 HotMan</h1>
  <p><strong>The Premium, Modern Desktop GUI for Proxmark3 (Iceman Fork)</strong></p>
  
  [![Release](https://img.shields.io/github/v/release/RazorCopter/PM3HotMan?style=for-the-badge&color=7c3aed)](https://github.com/RazorCopter/PM3HotMan/releases)
  [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge&color=06b6d4)](https://www.gnu.org/licenses/gpl-3.0)
  [![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey.svg?style=for-the-badge&logo=windows)](https://github.com/RazorCopter/PM3HotMan/releases)
</div>

<br/>

**PM3 HotMan** is a next-generation Graphical User Interface for the legendary [Proxmark3](https://github.com/RfidResearchGroup/proxmark3) RFID hacking tool. Built with Electron and Node.js, it replaces the traditional command-line experience with a stunning, responsive, and powerful visual dashboard.

<div align="center">
  <img src="docs/images/premium_dashboard.jpg" alt="PM3 HotMan Dashboard" width="100%"/>
</div>

---

## ✨ Premium Features

- **🚀 Zero Configuration**: PM3 HotMan bundles the underlying Proxmark3 engine. Just install the setup and it will automatically detect the bundled `proxmark3.exe`. No MSYS2 required.
- **💎 Cyberpunk UI & Glassmorphism**: A dark-mode, neon-accented interface designed for hackers who care about aesthetics as much as performance.
- **🔌 Auto-Connection**: Automatically scans for available COM ports and visually detects your Proxmark3 hardware.
- **🗂 Structured Parsing**: Say goodbye to walls of raw text! PM3 HotMan parses the PM3 output in real-time and displays beautifully structured cards containing UIDs, keys, tag types, and dumped files.
- **📂 One-Click Dumps**: Easily locate and open your dumped binary and JSON files directly from the UI. Dumps are safely stored in your `Documents` folder.
- **💾 Session Persistence**: Parsed results are cached per command. Switch between tasks without losing your data.
- **⚡ Quick Actions**: Built-in shortcuts for common tasks like `auto`, `hf mf info`, `lf search`, and comprehensive cracking workflows.
- **⏹ Safe Command Stop**: Interrupt long-running brute-force or cracking commands directly from the output panel or raw terminal.
- **🔄 Firmware & Client Updater**: Checks the connected device against the latest RRG release, selects the correct Generic/RDV4 build, validates the Windows package, flashes bootloader and full image, then atomically activates the matching client.
- **🌐 Bilingual Interface (ITA / ENG)**: Seamless instant switching between Italian and English with localized command cards, parameters, descriptions, and system logs.
- **🖥 Interactive Terminal**: A global raw terminal log is always available on the side if you want to see exactly what's happening under the hood.

---

## 🛠 Installation (Windows)

We provide a self-contained NSIS installer for Windows. You don't need to install MSYS2 or compile anything manually!

1. Download the latest `PM3 HotMan Setup.exe` from the [Releases page](https://github.com/RazorCopter/PM3HotMan/releases).
2. Run the installer (it takes less than a minute).
3. Open **PM3 HotMan** from your Desktop shortcut.
4. Plug in your Proxmark3, select your COM port, and click **Connect**.

> **Note**: This application uses the **Iceman Fork** engine under the hood.

---

## 💻 Development & Building

Want to tweak the UI, customize the parser, or add new features? 

```bash
# 1. Clone the repository
git clone https://github.com/RazorCopter/PM3HotMan.git
cd PM3HotMan/pm3-gui

# 2. Install dependencies
npm install

# 3. Run the app in development mode
npm start

# 4. Build the Windows Installer (.exe)
npm run build
```

### Architecture Overview
- **Renderer**: Vanilla JS + CSS (No heavy frameworks for maximum performance).
- **Main**: Electron (`main.js`), managing the PM3 PTY process, COM port scanning, and IPC bridges securely.
- **Parser**: A custom regex-based parsing engine (`parser.js`) that interprets the raw PM3 output and transforms it into structured UI cards.

---

## 📜 License

This project is open-source and follows the [GPL-3.0 License](LICENSE.txt) (same as the underlying Proxmark3 project).

## 🙏 Acknowledgements

- Built for the amazing [Iceman Fork](https://github.com/RfidResearchGroup/proxmark3) of Proxmark3.
- Thanks to the RFID research community.
