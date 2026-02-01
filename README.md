# Cleanium

A desktop app that finds developer junk on your disk—`node_modules`, venvs, Cargo build dirs, Docker unused stuff—and lets you clear it out. Windows only.

[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows)](https://www.microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron)](https://www.electronjs.org/)
[![Node](https://img.shields.io/badge/node-20+-339933?logo=nodedotjs)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

---

## What it does

Cleanium scans your user profile (and common dev locations) for folders that eat space: dependency trees, virtual envs, build outputs, and package caches. You get a list sorted by size, with filters by category. File-system items go to the **Recycle Bin** when you delete; Docker items (dangling images, stopped containers, unused volumes, build cache) are removed via the Docker API.

- **Scan** – Discovers Node, Python, Rust/Cargo, Go, Docker, Next/Nuxt, and generic build/cache dirs.
- **History** – Past scans stored in SQLite; open any run to see what was found.
- **Filter** – Limit the list by category (e.g. only Docker or only Node).
- **Export** – Save the current result set as JSON.

Built with Electron, so it’s a normal Windows app with a dark UI.

---

## ⚠️ Be careful with delete

**Deleting is real.** Even though file-system deletes use the Recycle Bin, you can still free a lot of space and break projects or tools if you remove the wrong thing.

- **Recycle Bin** – Files and folders you delete from the scan list are moved to the Recycle Bin. You can restore them from there until you empty it.
- **Docker** – Removing an image, container, or volume here is permanent (no Recycle Bin). We only list *safe-to-remove* Docker resources (dangling images, stopped containers, unused volumes, build cache). Don’t delete something you might need later.
- **Protected paths** – The app skips system dirs, `Program Files`, IDE/runtime data (e.g. VS Code, Cursor, npm global, Docker Desktop data). If something critical still appears, don’t delete it.

**Always check the path** before hitting Delete. When in doubt, leave it or restore from Recycle Bin.

---

## Requirements

- **Windows 10/11** (only platform supported).
- For **Docker** features: Docker Desktop (or another Docker engine) running; otherwise only file-system scan is used.

---

## Install

Grab the latest installer from [Releases](https://github.com/martian56/cleanium/releases): download the `.exe`, run it, and follow the setup. Optional: verify the file with the provided `.sha256` checksum.

---

## Build from source

You need Node.js 20+ and npm.

```bash
git clone https://github.com/martian56/cleanium.git
cd cleanium/desktop
npm install
npm start
```

To produce the Windows installer:

```bash
npm run build
```

Output is under `desktop/dist/`.

---

## What gets scanned

| Category        | Examples                                      |
|----------------|-----------------------------------------------|
| Node.js        | `node_modules`                                |
| Python         | `venv`, `.venv`, `env`                        |
| Rust/Cargo     | `target/`                                     |
| Cargo cache    | `.cargo/registry`, `.cargo/git`                |
| Go             | `go-build`, `GOPATH/pkg`                      |
| Docker         | Dangling images, stopped containers, unused volumes, build cache (via Docker API) |
| Next.js        | `.next`                                       |
| Nuxt           | `.nuxt`, `.output`                            |
| Build output   | `dist`, `build`, `out`, `.turbo` (in project-like paths) |
| Package caches | npm/yarn/pnpm/pip/cargo cache dirs            |

Protected locations (e.g. `Program Files`, AppData for IDEs, global npm, Docker Desktop) are excluded so they don’t show up as deletable.

---

## License

ISC. See [LICENSE](LICENSE) if you need it.
