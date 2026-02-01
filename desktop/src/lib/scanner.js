const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { shell } = require('electron');

// Categories for developer artifacts (folder name or path pattern -> category)
const CATEGORIES = {
  node: {
    patterns: ['node_modules'],
    label: 'Node.js',
    description: 'node_modules',
  },
  python: {
    patterns: ['venv', '.venv', 'env', '.env'],
    label: 'Python',
    description: 'Virtual envs',
  },
  rust: {
    patterns: ['target'],
    label: 'Rust/Cargo',
    description: 'Cargo target & build',
  },
  cargoCache: {
    patterns: ['.cargo'],
    pathMatch: (p) => p.includes(path.join('.cargo', 'registry')) || p.includes(path.join('.cargo', 'git')),
    label: 'Cargo cache',
    description: 'Cargo registry & git cache',
  },
  pycache: {
    patterns: ['__pycache__', '.pytest_cache', '.mypy_cache'],
    label: 'Python cache',
    description: 'Bytecode & caches',
  },
  go: {
    patterns: ['go-build'],
    pathMatch: (p) => p.includes('go-build') || (p.includes('gopath') && p.includes('pkg')),
    label: 'Go',
    description: 'Go build cache',
  },
  docker: {
    pathMatch: (p) => p.includes('docker-desktop-data') || p.includes('Docker') && (p.includes('data') || p.includes('cache')),
    label: 'Docker',
    description: 'Images, cache, volumes',
  },
  next: {
    patterns: ['.next'],
    label: 'Next.js',
    description: 'Next.js build',
  },
  nuxt: {
    patterns: ['.nuxt', '.output'],
    label: 'Nuxt',
    description: 'Nuxt build',
  },
  buildDirs: {
    patterns: ['dist', 'build', 'out', '.turbo'],
    pathMatch: (p) => {
      const base = path.basename(p);
      return ['dist', 'build', 'out', '.turbo'].includes(base) && p.length > 20;
    },
    label: 'Build output',
    description: 'dist / build / out',
  },
  caches: {
    pathMatch: (p) => {
      const lower = p.toLowerCase();
      return (
        lower.includes('npm-cache') ||
        lower.includes('cache\\npm') ||
        lower.includes('cache\\yarn') ||
        lower.includes('cache\\pnpm') ||
        lower.includes('pip\\cache') ||
        lower.includes('cache\\pip') ||
        (lower.includes('cargo') && lower.includes('registry'))
      );
    },
    label: 'Package caches',
    description: 'npm / pip / cargo cache',
  },
};

/**
 * Protected roots (Windows): any path under these directories is never suggested for deletion.
 * Deleting any of these would break IDEs, runtimes, package managers, or system tools.
 */
function getProtectedRoots() {
  const roots = [];
  const home = os.homedir();
  const sep = path.sep;
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const drive = path.resolve(home).split(sep)[0] || 'C:';

  // Home-level (user profile) – includes tool/extension dirs that must not be deleted
  // Note: 'go' (no dot) is default GOPATH on Windows (e.g. C:\Users\...\go\pkg\mod)
  const homeRoots = [
    '.cargo', '.rustup', '.cursor', '.vscode', '.npm', '.nvm', '.fnm', '.volta', '.bun', '.node',
    '.pyenv', '.rbenv', '.rvm', '.go', 'go', '.m2', '.gradle', '.dotnet', '.nuget', '.docker', '.kube',
    '.terraform.d', '.aws', '.config', '.local', '.gem', '.composer', '.cabal', '.ghcup',
    '.luarocks', '.R', '.cpan', '.chef', '.puppetlabs', '.android', '.ssh', '.gnupg',
    '.gologin',   // GoLogin browser – extensions & profiles
    '.serverless', // Serverless Framework – releases & plugins
  ];
  homeRoots.forEach((dir) => roots.push(path.join(home, dir)));

  // IDE / editor (AppData)
  roots.push(path.join(appData, 'Code'), path.join(appData, 'Cursor'));
  roots.push(path.join(localAppData, 'Cursor'), path.join(localAppData, 'Programs'));
  roots.push(path.join(localAppData, 'Microsoft', 'VS Code'));
  roots.push(path.join(localAppData, 'Programs', 'Microsoft VS Code'));
  roots.push(path.join(localAppData, 'Microsoft')); // TypeScript, Office, dotnet, etc.
  roots.push(path.join(localAppData, 'JetBrains'), path.join(appData, 'JetBrains'));

  // Desktop apps (Slack, Discord, Beekeeper Studio, etc.) – deleting breaks the app
  roots.push(path.join(localAppData, 'Slack'), path.join(localAppData, 'Discord'));
  roots.push(path.join(appData, 'beekeeper-studio'));
  roots.push(path.join(localAppData, 'Temp', 'cursor-sandbox-cache')); // Cursor sandbox temp

  // Node / npm / pnpm / yarn (nvm can be in Roaming or Local)
  roots.push(path.join(appData, 'npm'), path.join(localAppData, 'pnpm'));
  roots.push(path.join(localAppData, 'Yarn'), path.join(localAppData, 'fnm'));
  roots.push(path.join(appData, 'nvm'), path.join(localAppData, 'nvm'));
  roots.push(path.join(localAppData, 'bun'));

  // .NET
  roots.push(path.join(appData, 'NuGet'), path.join(localAppData, 'Microsoft', 'dotnet'));

  // Docker (Desktop uses "Docker Desktop" in Roaming)
  roots.push(path.join(localAppData, 'Docker'), path.join(appData, 'Docker'));
  roots.push(path.join(appData, 'Docker Desktop'));

  // Android
  roots.push(path.join(localAppData, 'Android'));

  // Google Cloud
  roots.push(path.join(appData, 'gcloud'));
  roots.push(path.join(localAppData, 'Google', 'Cloud SDK'));

  // System
  roots.push(path.join(drive, 'Program Files'));
  roots.push(path.join(drive, 'Program Files (x86)'));
  roots.push(path.join(drive, 'Go'));
  roots.push(path.join(drive, 'ProgramData'));

  return roots.filter(Boolean).map((r) => path.normalize(r));
}

let cachedProtectedRoots = null;

function isProtectedPath(dirPath) {
  if (!dirPath) return true;
  if (cachedProtectedRoots === null) {
    cachedProtectedRoots = getProtectedRoots();
  }
  const normalized = path.normalize(dirPath.replace(/\//g, path.sep));
  const sep = path.sep;
  const candidate = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  for (const root of cachedProtectedRoots) {
    const rootCompare = process.platform === 'win32' ? root.toLowerCase() : root;
    if (candidate === rootCompare || candidate.startsWith(rootCompare + sep)) return true;
  }
  return false;
}

function getCategory(dirPath, baseName) {
  const normalized = dirPath.replace(/\//g, path.sep);
  for (const [key, config] of Object.entries(CATEGORIES)) {
    if (config.patterns && config.patterns.includes(baseName)) {
      // buildDirs: only match dist/build/out when path is long enough (avoid false positives)
      if (key === 'buildDirs' && config.pathMatch && !config.pathMatch(normalized)) continue;
      return { key, label: config.label, description: config.description };
    }
    if (config.pathMatch && config.pathMatch(normalized)) {
      return { key, label: config.label, description: config.description };
    }
  }
  return null;
}

async function getDirSize(dirPath, signal = { aborted: false }) {
  let size = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const ent of entries) {
      if (signal.aborted) break;
      const full = path.join(dirPath, ent.name);
      try {
        if (ent.isDirectory()) {
          size += await getDirSize(full, signal);
        } else {
          const s = await fs.stat(full);
          size += s.size;
        }
      } catch {
        // skip permission errors / symlinks
      }
    }
  } catch {
    return 0;
  }
  return size;
}

async function* walkDevArtifacts(rootPaths, includeHidden = true, signal = { aborted: false }) {
  const seen = new Set();
  const roots = Array.isArray(rootPaths) && rootPaths.length ? rootPaths : [os.homedir()];

  // Add known dev locations (Windows)
  const user = process.env.USERPROFILE || os.homedir();
  roots.push(path.join(user, '.cargo'));
  roots.push(path.join(user, 'AppData', 'Local', 'npm-cache'));
  roots.push(path.join(user, 'AppData', 'Local', 'Yarn', 'Cache'));
  roots.push(path.join(user, 'AppData', 'Local', 'pnpm'));
  roots.push(path.join(user, 'AppData', 'Local', 'pip', 'cache'));
  roots.push(path.join(user, 'go', 'pkg'));
  roots.push(path.join(process.env.APPDATA || '', 'Docker'));
  roots.push(path.join(process.env.LOCALAPPDATA || '', 'Docker'));

  for (const root of roots) {
    if (signal.aborted) return;
    let normalizedRoot;
    try {
      normalizedRoot = await fs.realpath(root);
    } catch {
      continue;
    }
    const queue = [normalizedRoot];
    while (queue.length) {
      if (signal.aborted) return;
      const dir = queue.shift();
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const ent of entries) {
        if (signal.aborted) return;
        if (!ent.isDirectory()) continue;
        const name = ent.name;
        if (!includeHidden && name.startsWith('.')) continue;
        const full = path.join(dir, name);
        let real;
        try {
          real = await fs.realpath(full);
        } catch {
          continue;
        }
        if (seen.has(real)) continue;
        const category = getCategory(real, name);
        if (category) {
          // Never suggest Python cache (__pycache__, .pytest_cache, .mypy_cache) – safe but noisy
          if (category.key === 'pycache') continue;
          if (isProtectedPath(real)) continue;
          seen.add(real);
          const size = await getDirSize(real, signal);
          yield { path: real, size, category: category.label, description: category.description };
        } else {
          // Don't recurse into known huge dirs to save time
          if (name === 'node_modules' || name === 'target' || name === '.git') continue;
          queue.push(real);
        }
      }
    }
  }
}

function startScan(rootPaths, includeHidden = true, signal = { aborted: false }) {
  return walkDevArtifacts(rootPaths, includeHidden, signal);
}

async function deletePath(targetPath, useTrash = true) {
  if (useTrash) {
    await shell.trashItem(targetPath);
    return { deleted: true, trash: true };
  }
  await fs.rm(targetPath, { recursive: true, force: true });
  return { deleted: true, trash: false };
}

module.exports = { startScan, deletePath, getCategory, CATEGORIES };
