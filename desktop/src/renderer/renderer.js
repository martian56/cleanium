(function () {
  const scanBtn = document.getElementById('scanBtn');
  const includeHidden = document.getElementById('includeHidden');
  const scanStatus = document.getElementById('scanStatus');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const resultsSection = document.getElementById('resultsSection');
  const resultsSummary = document.getElementById('resultsSummary');
  const resultsBody = document.getElementById('resultsBody');
  const selectAllCheck = document.getElementById('selectAllCheck');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const emptyState = document.getElementById('emptyState');
  const viewScan = document.getElementById('viewScan');
  const viewHistory = document.getElementById('viewHistory');
  const pageTitle = document.getElementById('pageTitle');
  const pageTagline = document.getElementById('pageTagline');
  const navItems = document.querySelectorAll('.nav-item');
  const sidebarHistory = document.getElementById('sidebarHistory');
  const scanList = document.getElementById('scanList');
  const historyHint = document.getElementById('historyHint');
  const historyResults = document.getElementById('historyResults');
  const historySummary = document.getElementById('historySummary');
  const historyBody = document.getElementById('historyBody');
  const stopScanBtn = document.getElementById('stopScanBtn');
  const exportBtn = document.getElementById('exportBtn');
  const deleteScanBtn = document.getElementById('deleteScanBtn');
  const filterCategory = document.getElementById('filterCategory');

  let runningTotalBytes = 0;
  let scanning = false;
  let currentScanId = null;
  let lastScanResults = [];

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay ? d.toLocaleTimeString() : d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  function categoryClass(category) {
    const map = {
      'Node.js': 'cat-node',
      'Python': 'cat-python',
      'Rust/Cargo': 'cat-rust',
      'Cargo cache': 'cat-cargo-cache',
      'Python cache': 'cat-python-cache',
      'Go': 'cat-go',
      'Docker': 'cat-docker',
      'Next.js': 'cat-next',
      'Nuxt': 'cat-nuxt',
      'Build output': 'cat-build-output',
      'Package caches': 'cat-package-caches',
    };
    return map[category] || 'cat-other';
  }

  const categoryIcons = {
    'Node.js': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 2L2 5v6l6 3 6-3V5L8 2zm0 1.5l4 2v4l-4 2-4-2v-4l4-2z"/></svg>',
    'Python': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4 3h4v2H5v2H4V3zm4 10h4v-2H9v-2h3V7H4v2h4v2H4v2h4v2zm4-6h-1v2h1V7z"/></svg>',
    'Rust/Cargo': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 2a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4zm0 2a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0V6a2 2 0 0 1 2-2z"/></svg>',
    'Cargo cache': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2 4v8h12V4H2zm2 2h8v4H4V6z"/></svg>',
    'Python cache': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4 4h8v2H6v2H4V4zm2 4h4v4H6V8z"/></svg>',
    'Go': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle fill="currentColor" cx="8" cy="8" r="3"/></svg>',
    'Docker': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2 5h3v2H2V5zm4 0h3v2H6V5zm4 0h3v2h-3V5zm-8 3h3v2H2V8zm4 0h3v2H6V8zm4 0h3v2h-3V8zm4 0h2v2h-2V8zM2 11h3v2H2v-2zm4 0h3v2H6v-2zm4 0h3v2h-3v-2z"/></svg>',
    'Next.js': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 2l6 6-6 6V8L2 2l6 6V2z"/></svg>',
    'Nuxt': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3 3h4l3 5 3-5h4v10h-3V8l-2 3.5L8 6v7H5V3z"/></svg>',
    'Build output': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2 4h5v2H2V4zm6 0h6v2H8V4zM2 7h4v2H2V7zm6 0h6v2H8V7zM2 10h5v2H2v-2zm6 0h6v2H8v-2z"/></svg>',
    'Package caches': '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2 6h4v4H2V6zm6 0h4v4H8V6zm-6 4h4v2H2v-2zm6 0h4v2H8v-2z"/></svg>',
  };

  function categoryIcon(category) {
    return categoryIcons[category] || '<svg class="category-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle fill="currentColor" cx="8" cy="8" r="2"/></svg>';
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return escapeHtml(String(s)).replace(/"/g, '&quot;');
  }

  function shortPath(p, max = 60) {
    const s = String(p);
    if (s.length <= max) return s;
    return '…' + s.slice(-max);
  }

  function appendResultRow(item, animate = true) {
    const tr = document.createElement('tr');
    tr.dataset.size = String(item.size);
    tr.dataset.category = item.category || '';
    const isDocker = item.dockerType && item.dockerId;
    const dockerAttrs = isDocker
      ? ` data-docker-type="${escapeAttr(item.dockerType)}" data-docker-id="${escapeAttr(item.dockerId)}"`
      : '';
    if (animate) tr.classList.add('new-row');
    tr.innerHTML = `
      <td class="col-check">
        <input type="checkbox" class="row-check" data-path="${escapeAttr(item.path)}"${dockerAttrs} aria-label="Select" />
      </td>
      <td class="col-category">
        <span class="category-badge ${escapeAttr(categoryClass(item.category))}">${categoryIcon(item.category)}${escapeHtml(item.category)}</span>
      </td>
      <td class="col-path path-cell" title="${escapeAttr(item.path)}">${escapeHtml(shortPath(item.path))}</td>
      <td class="col-size">${formatBytes(item.size)}</td>
      <td class="col-action">
        <button type="button" class="btn btn-danger btn-sm delete-one" data-path="${escapeAttr(item.path)}"${dockerAttrs}>Delete</button>
      </td>
    `;
    // Insert in size order (largest first)
    const rows = resultsBody.querySelectorAll('tr');
    let inserted = false;
    for (const row of rows) {
      const rowSize = Number(row.dataset.size) || 0;
      if (item.size > rowSize) {
        resultsBody.insertBefore(tr, row);
        inserted = true;
        break;
      }
    }
    if (!inserted) resultsBody.appendChild(tr);
    bindRowEventsFor(tr);
    applyCategoryFilter(tr);
    if (animate) setTimeout(() => tr.classList.remove('new-row'), 250);
  }

  function refreshFilterOptions() {
    const categories = [...new Set(lastScanResults.map((r) => r.category).filter(Boolean))].sort();
    const value = filterCategory.value;
    filterCategory.innerHTML = '<option value="All">All</option>' +
      categories.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');
    if (categories.includes(value)) filterCategory.value = value;
    else filterCategory.value = 'All';
    applyCategoryFilter();
  }

  function applyCategoryFilter(rowOrAll) {
    const value = filterCategory.value || 'All';
    const rows = rowOrAll ? [rowOrAll] : resultsBody.querySelectorAll('tr');
    for (const tr of rows) {
      const category = tr.dataset.category;
      tr.style.display = value === 'All' || category === value ? '' : 'none';
    }
  }

  function getRowMeta(tr) {
    const el = tr.querySelector('.row-check') || tr.querySelector('.delete-one');
    const path = el?.getAttribute('data-path');
    const dockerType = el?.getAttribute('data-docker-type') || null;
    const dockerId = el?.getAttribute('data-docker-id') || null;
    return { path, dockerType, dockerId };
  }

  function bindRowEventsFor(tr) {
    const cb = tr.querySelector('.row-check');
    const btn = tr.querySelector('.delete-one');
    if (cb) cb.addEventListener('change', updateSelectAllState);
    if (btn) btn.addEventListener('click', () => {
      const { path, dockerType, dockerId } = getRowMeta(tr);
      deletePaths([{ path, dockerType, dockerId }]);
    });
  }

  function bindRowEvents() {
    resultsBody.querySelectorAll('tr').forEach((tr) => bindRowEventsFor(tr));
  }

  function updateRunningSummary(count, totalBytes) {
    resultsSummary.textContent = `${count} items · ${formatBytes(totalBytes)} total`;
  }

  function updateDeleteButton() {
    const checked = resultsBody.querySelectorAll('.row-check:checked');
    deleteSelectedBtn.disabled = checked.length === 0;
  }

  function updateSelectAllState() {
    const checks = resultsBody.querySelectorAll('.row-check');
    const checked = resultsBody.querySelectorAll('.row-check:checked');
    selectAllCheck.checked = checks.length > 0 && checked.length === checks.length;
    selectAllCheck.indeterminate = checked.length > 0 && checked.length < checks.length;
    updateDeleteButton();
  }

  resultsBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('row-check')) updateSelectAllState();
  });

  if (filterCategory) {
    filterCategory.addEventListener('change', () => applyCategoryFilter());
  }

  selectAllCheck.addEventListener('change', () => {
    resultsBody.querySelectorAll('.row-check').forEach((cb) => {
      cb.checked = selectAllCheck.checked;
    });
    updateSelectAllState();
  });

  selectAllBtn.addEventListener('click', () => {
    const allChecked = resultsBody.querySelectorAll('.row-check').length ===
      resultsBody.querySelectorAll('.row-check:checked').length;
    resultsBody.querySelectorAll('.row-check').forEach((cb) => {
      cb.checked = !allChecked;
    });
    updateSelectAllState();
  });

  deleteSelectedBtn.addEventListener('click', () => {
    const paths = Array.from(resultsBody.querySelectorAll('tr'))
      .filter((tr) => tr.querySelector('.row-check')?.checked)
      .map((tr) => getRowMeta(tr));
    if (paths.length) deletePaths(paths);
  });

  function removeRowsByPath(items) {
    const pathSet = new Set(items.map((it) => (typeof it === 'string' ? it : it.path)));
    resultsBody.querySelectorAll('tr').forEach((tr) => {
      const path = tr.querySelector('.row-check')?.getAttribute('data-path');
      if (path && pathSet.has(path)) {
        tr.classList.add('removed');
        const cb = tr.querySelector('.row-check');
        const btn = tr.querySelector('.delete-one');
        if (cb) cb.disabled = true;
        if (btn) btn.disabled = true;
      }
    });
  }

  function setButtonSpinner(btn, show, label = 'Delete') {
    if (!btn) return;
    if (show) {
      btn.disabled = true;
      btn.classList.add('btn-spinner');
      btn.dataset.originalText = btn.textContent;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
    } else {
      btn.classList.remove('btn-spinner');
      btn.textContent = label;
      const rowRemoved = btn.closest('tr')?.classList.contains('removed');
      btn.disabled = rowRemoved;
    }
  }

  async function deletePaths(items) {
    const list = items.map((it) => (typeof it === 'string' ? { path: it } : it));
    const dockerCount = list.filter((it) => it.dockerType && it.dockerId).length;
    const fileCount = list.length - dockerCount;
    let msg = '';
    if (dockerCount && fileCount) {
      msg = `${fileCount} item(s) will be moved to Recycle Bin. ${dockerCount} Docker item(s) will be removed (cannot be undone). Continue?`;
    } else if (dockerCount) {
      msg = `Remove ${dockerCount} Docker item(s)? This cannot be undone.`;
    } else {
      msg = `Move ${list.length} item(s) to Recycle Bin?\n\nYou can restore them from Recycle Bin if needed.`;
    }
    if (!confirm(msg)) return;
    const pathSet = new Set(list.map((it) => it.path));
    const rowButtons = [];
    resultsBody.querySelectorAll('tr').forEach((tr) => {
      const p = tr.querySelector('.row-check')?.getAttribute('data-path');
      if (p && pathSet.has(p)) {
        const btn = tr.querySelector('.delete-one');
        if (btn) rowButtons.push(btn);
      }
    });
    rowButtons.forEach((b) => setButtonSpinner(b, true));
    setButtonSpinner(deleteSelectedBtn, true, 'Delete selected');
    scanStatus.textContent = dockerCount ? `Removing ${list.length} item(s)…` : `Moving ${list.length} item(s) to Recycle Bin…`;
    try {
      for (const it of list) {
        const path = typeof it === 'string' ? it : it.path;
        await window.cleanium.deletePath(path, true, it.dockerType || null, it.dockerId || null);
      }
      removeRowsByPath(list);
      scanStatus.textContent = dockerCount
        ? `Removed ${list.length} item(s).`
        : `Moved ${list.length} item(s) to Recycle Bin.`;
    } catch (err) {
      scanStatus.textContent = 'Error: ' + (err.message || String(err));
      console.error(err);
    } finally {
      rowButtons.forEach((b) => setButtonSpinner(b, false));
      setButtonSpinner(deleteSelectedBtn, false, 'Delete selected');
      updateSelectAllState();
    }
  }

  // --- Sidebar nav ---
  function showView(name) {
    viewScan.classList.toggle('hidden', name !== 'scan');
    viewHistory.classList.toggle('hidden', name !== 'history');
    if (name === 'scan') {
      pageTitle.textContent = 'Scan';
      if (pageTagline) pageTagline.textContent = 'Find and free space from dev artifacts';
    } else {
      pageTitle.textContent = 'History';
      if (pageTagline) pageTagline.textContent = 'Select a scan from the sidebar';
    }
    navItems.forEach((el) => {
      const isActive = el.getAttribute('data-view') === name;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-current', isActive ? 'page' : null);
    });
    if (name === 'history') {
      sidebarHistory.hidden = false;
      loadScanList();
    } else {
      sidebarHistory.hidden = true;
    }
  }

  function formatScanDateTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  navItems.forEach((el) => {
    el.addEventListener('click', () => showView(el.getAttribute('data-view')));
  });

  async function loadScanList() {
    scanList.innerHTML = '';
    try {
      const scans = await window.cleanium.getScans();
      if (scans.length === 0) {
        const li = document.createElement('li');
        li.className = 'scan-list-item';
        li.textContent = 'No scans yet';
        li.style.pointerEvents = 'none';
        li.style.opacity = '0.7';
        scanList.appendChild(li);
        return;
      }
      scans.forEach((s) => {
        const li = document.createElement('button');
        li.type = 'button';
        li.className = 'scan-list-item';
        li.dataset.scanId = String(s.id);
        li.innerHTML = `${s.item_count} items · ${formatBytes(s.total_bytes)}<span class="scan-date">${formatDate(s.created_at)}</span>`;
        li.addEventListener('click', () => selectScan(s.id, s.created_at));
        scanList.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      scanList.innerHTML = '<li class="scan-list-item" style="pointer-events:none;opacity:0.7">Failed to load</li>';
    }
  }

  function selectScan(scanId, createdAt) {
    currentScanId = scanId;
    scanList.querySelectorAll('.scan-list-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.scanId === String(scanId));
    });
    if (createdAt != null && pageTitle && pageTagline) {
      pageTitle.textContent = 'Scan at ' + formatScanDateTime(createdAt);
      pageTagline.textContent = '';
    }
    loadFindings(scanId);
  }

  async function loadFindings(scanId) {
    historyHint.hidden = true;
    historyResults.hidden = false;
    historyBody.innerHTML = '';
    try {
      const findings = await window.cleanium.getFindings(scanId);
      const totalBytes = findings.reduce((s, r) => s + r.size, 0);
      historySummary.textContent = `${findings.length} items · ${formatBytes(totalBytes)} total`;
      findings.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="col-category">
            <span class="category-badge ${escapeAttr(categoryClass(item.category))}">${categoryIcon(item.category)}${escapeHtml(item.category)}</span>
          </td>
          <td class="col-path path-cell" title="${escapeAttr(item.path)}">${escapeHtml(shortPath(item.path))}</td>
          <td class="col-size">${formatBytes(item.size)}</td>
        `;
        historyBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      historySummary.textContent = 'Failed to load findings.';
    }
    if (deleteScanBtn) deleteScanBtn.hidden = false;
  }

  deleteScanBtn.addEventListener('click', async () => {
    if (currentScanId == null) return;
    if (!confirm('Remove this scan from history? This cannot be undone.')) return;
    try {
      await window.cleanium.deleteScan(currentScanId);
      currentScanId = null;
      historyResults.hidden = true;
      historyHint.hidden = false;
      deleteScanBtn.hidden = true;
      if (pageTitle) pageTitle.textContent = 'History';
      if (pageTagline) pageTagline.textContent = 'Select a scan from the sidebar';
      loadScanList();
    } catch (err) {
      console.error(err);
    }
  });

  // --- Scan (real-time) ---
  scanBtn.addEventListener('click', async () => {
    if (scanning) return;
    scanning = true;
    scanBtn.disabled = true;
    progressBar.setAttribute('aria-hidden', 'false');
    progressFill.style.width = '0%';
    scanStatus.textContent = 'Scanning…';
    emptyState.classList.add('hidden');
    resultsSection.hidden = false;
    resultsBody.innerHTML = '';
    runningTotalBytes = 0;
    if (filterCategory) {
      filterCategory.value = 'All';
      filterCategory.innerHTML = '<option value="All">All</option>';
    }

    lastScanResults = [];
    window.cleanium.offScanProgress();
    window.cleanium.onScanProgress(({ item, total }) => {
      if (item) {
        lastScanResults.push(item);
        runningTotalBytes += item.size;
        appendResultRow(item, true);
      }
      progressFill.style.width = (total < 1 ? 0 : Math.min(100, (total / 500) * 100)) + '%';
      scanStatus.textContent = `Found ${total} item${total === 1 ? '' : 's'}…`;
      updateRunningSummary(total, runningTotalBytes);
      updateSelectAllState();
    });

    scanBtn.hidden = true;
    stopScanBtn.hidden = false;
    stopScanBtn.disabled = false;

    try {
      const roots = await window.cleanium.getDefaultRoots();
      const { results, durationMs, stopped } = await window.cleanium.startScan({
        rootPaths: roots,
        includeHidden: includeHidden.checked,
      });
      lastScanResults = results;
      progressFill.style.width = '100%';
      const totalBytes = results.reduce((s, r) => s + r.size, 0);
      updateRunningSummary(results.length, totalBytes);
      refreshFilterOptions();
      if (stopped) {
        scanStatus.textContent = `Stopped. ${results.length} items synced to database.`;
      } else {
        scanStatus.textContent = `Done. ${results.length} items synced to database (${(durationMs / 1000).toFixed(1)}s).`;
      }
      updateSelectAllState();
      exportBtn.disabled = lastScanResults.length === 0;
      if (sidebarHistory && !sidebarHistory.hidden) loadScanList();
    } catch (err) {
      scanStatus.textContent = 'Scan failed: ' + (err.message || String(err));
      console.error(err);
    } finally {
      scanning = false;
      scanBtn.disabled = false;
      scanBtn.hidden = false;
      stopScanBtn.hidden = true;
      progressBar.setAttribute('aria-hidden', 'true');
      exportBtn.disabled = lastScanResults.length === 0;
    }
  });

  stopScanBtn.addEventListener('click', () => {
    if (!scanning) return;
    stopScanBtn.disabled = true;
    window.cleanium.stopScan();
  });

  exportBtn.addEventListener('click', async () => {
    if (lastScanResults.length === 0) return;
    const totalBytes = lastScanResults.reduce((s, r) => s + r.size, 0);
    const data = {
      exportedAt: new Date().toISOString(),
      itemCount: lastScanResults.length,
      totalBytes,
      findings: lastScanResults,
    };
    try {
      const { canceled, filePath } = await window.cleanium.exportResults(data);
      if (canceled) {
        scanStatus.textContent = 'Export canceled.';
      } else {
        scanStatus.textContent = `Exported to ${filePath}.`;
      }
    } catch (err) {
      scanStatus.textContent = 'Export failed: ' + (err.message || String(err));
      console.error(err);
    }
  });
})();
