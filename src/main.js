// uBase Installer — Main Logic

const state = {
  activeTab: 'marketplace',
  currentStep: 1,
  apiKey: localStorage.getItem('ubase_api_key') || '',
  selectedPacket: null,
  selectedAppId: '69fd0d1e04e347cf57ca9473',
  history: JSON.parse(localStorage.getItem('ubase_history') || '[]')
};

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupDropzone();
  setupStep3();
  setupStep4();
  setupSettings();
  setupHistory();

  if (state.apiKey) {
    document.getElementById('api-key-input').value = state.apiKey;
  }

  // expand prompt btn
  const expandBtn = document.getElementById('expand-prompt-btn');
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      const pre = document.getElementById('prompt-preview');
      const isExpanded = pre.classList.contains('expanded');
      if (isExpanded) {
        pre.classList.remove('expanded');
        expandBtn.textContent = 'Expand';
      } else {
        pre.classList.add('expanded');
        expandBtn.textContent = 'Collapse';
      }
    });
  }
});

// ── NAV ──────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.getAttribute('data-tab')));
  });

  const btnViewHistory = document.getElementById('btn-view-history');
  if (btnViewHistory) btnViewHistory.addEventListener('click', () => switchTab('history'));
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId + '-tab');
  });
  if (tabId === 'history') renderHistory();
}

// ── STEP PROGRESS ─────────────────────────────────────
function updateStepProgress(step) {
  for (let i = 1; i <= 5; i++) {
    const dot = document.getElementById('sp-' + i);
    const line = document.getElementById('sl-' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < step) dot.classList.add('done');
    else if (i === step) dot.classList.add('active');
    if (line) line.classList.toggle('done', i < step);
  }
}

window.goToStep = function(step) {
  state.currentStep = step;
  document.querySelectorAll('.wizard-step').forEach((el, idx) => {
    el.classList.toggle('active', idx + 1 === step);
  });
  updateStepProgress(step);
};

window.resetWizard = function() {
  state.selectedPacket = null;
  document.getElementById('file-input').value = '';
  goToStep(1);
  switchTab('install');
};

// ── DROPZONE ──────────────────────────────────────────
function setupDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  // Click on dropzone (but not on the button itself to avoid double trigger)
  dropzone.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-browse')) return; // handled below
    fileInput.click();
  });

  // Browse button click
  const browseBtn = dropzone.querySelector('.btn-browse');
  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
  });
}

async function handleFile(file) {
  if (!file.name.endsWith('.ubase') && !file.name.endsWith('.zip')) {
    showToast('Please upload a .ubase file.', 'danger');
    return;
  }

  showToast('Reading packet...');

  try {
    const packet = await parseUbase(file);
    state.selectedPacket = packet;

    // Populate step 2
    document.getElementById('packet-name').textContent = packet.meta.name || 'Unnamed Packet';
    document.getElementById('packet-version').textContent = packet.meta.version || '1.0.0';
    document.getElementById('packet-author').textContent = packet.meta.author_name || packet.meta.author || 'Unknown';
    document.getElementById('packet-description').textContent = packet.meta.description || 'No description.';

    const fileList = document.getElementById('packet-files');
    fileList.innerHTML = '';
    const files = packet.meta.files || packet.fileNames || [];
    if (files.length > 0) {
      files.forEach(f => {
        const tag = document.createElement('span');
        tag.className = 'file-tag';
        tag.textContent = f;
        fileList.appendChild(tag);
      });
    } else {
      fileList.innerHTML = '<span style="color:var(--muted);font-size:12px;">No file manifest</span>';
    }

    const promptEl = document.getElementById('prompt-preview');
    promptEl.textContent = packet.prompt || '(no prompt.md found)';
    promptEl.classList.remove('expanded');

    const expandBtn = document.getElementById('expand-prompt-btn');
    expandBtn.style.display = (packet.prompt && packet.prompt.length > 200) ? 'inline-block' : 'none';
    expandBtn.textContent = 'Expand';

    goToStep(2);
  } catch (err) {
    console.error(err);
    showToast('Failed to read packet: ' + err.message, 'danger');
  }
}

async function parseUbase(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = async (e) => {
      try {
        if (typeof JSZip === 'undefined') {
          reject(new Error('JSZip not loaded'));
          return;
        }

        const zip = await JSZip.loadAsync(e.target.result);
        const keys = Object.keys(zip.files);

        // Find meta.json and prompt.md (case-insensitive, any depth)
        const metaKey = keys.find(k => k.toLowerCase().endsWith('meta.json'));
        const promptKey = keys.find(k => k.toLowerCase().endsWith('prompt.md'));

        if (!metaKey) {
          reject(new Error('meta.json not found in packet'));
          return;
        }

        const metaText = await zip.file(metaKey).async('string');
        const meta = JSON.parse(metaText);
        const prompt = promptKey ? await zip.file(promptKey).async('string') : '';
        const fileNames = keys.filter(k => !zip.files[k].dir);

        resolve({ meta, prompt, fileNames, fileName: file.name });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── STEP 3 ────────────────────────────────────────────
function setupStep3() {
  const select = document.getElementById('target-app-select');
  const customGroup = document.getElementById('custom-app-group');
  if (!select) return;

  select.addEventListener('change', () => {
    const isCustom = select.value === 'custom';
    customGroup.style.display = isCustom ? 'block' : 'none';
    if (!isCustom) state.selectedAppId = select.value;
  });

  document.getElementById('custom-app-input').addEventListener('input', (e) => {
    state.selectedAppId = e.target.value.trim();
  });
}

// ── STEP 4 ────────────────────────────────────────────
function setupStep4() {
  const btnInstall = document.getElementById('btn-install');
  if (!btnInstall) return;

  // Populate summary when step 4 becomes visible — hook into goToStep
  const origGoToStep = window.goToStep;
  window.goToStep = function(step) {
    origGoToStep(step);
    if (step === 4 && state.selectedPacket) {
      const select = document.getElementById('target-app-select');
      const appLabel = select.options[select.selectedIndex]
        ? select.options[select.selectedIndex].text
        : state.selectedAppId;
      document.getElementById('summary-packet').textContent =
        state.selectedPacket.meta.name || state.selectedPacket.fileName;
      document.getElementById('summary-app').textContent =
        select.value === 'custom' ? (state.selectedAppId || 'Custom App') : appLabel;
    }
  };

  btnInstall.addEventListener('click', () => runInstall());
}

async function runInstall() {
  if (!state.selectedPacket) {
    showToast('No packet loaded.', 'danger');
    return;
  }

  const appId = state.selectedAppId ||
    document.getElementById('target-app-select').value;

  if (!appId || appId === 'custom') {
    showToast('Please enter an App ID.', 'danger');
    return;
  }

  const apiKey = state.apiKey || localStorage.getItem('ubase_api_key');
  if (!apiKey) {
    showToast('Save your Base44 API Key in Settings first.', 'danger');
    switchTab('settings');
    return;
  }

  const btnInstall = document.getElementById('btn-install');
  const btnBack = document.getElementById('btn-back-4');
  const progressCard = document.getElementById('progress-card');
  const progressBar = document.getElementById('progress-bar');
  const statusText = document.getElementById('status-text');

  btnInstall.disabled = true;
  btnBack.disabled = true;
  progressCard.style.display = 'block';

  const setProgress = (pct, msg) => {
    progressBar.style.width = pct + '%';
    statusText.textContent = msg;
  };

  try {
    setProgress(20, 'Connecting to Base44...');
    await sleep(400);

    setProgress(50, 'Sending install prompt...');

    const agentId = '69fd12da185a6e091e5bea1c'; // xBuildy AI agent
    const prompt = state.selectedPacket.prompt;
    const packetName = state.selectedPacket.meta.name || 'Unknown Packet';

    const body = JSON.stringify({
      message: `Install this uBase packet into app ${appId}:\n\n${prompt}`
    });

    const response = await fetch(`https://api.base44.com/api/agents/${agentId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey
      },
      body
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    setProgress(85, 'Prompt delivered! Builder is processing...');
    await sleep(600);
    setProgress(100, 'Done!');
    await sleep(400);

    // Save to history
    const record = {
      packetName,
      appId,
      date: new Date().toLocaleString(),
      status: 'success'
    };
    state.history.unshift(record);
    localStorage.setItem('ubase_history', JSON.stringify(state.history.slice(0, 100)));

    document.getElementById('success-message').textContent =
      `"${packetName}" was sent to the builder for app ${appId}. Check your Base44 builder for the install conversation.`;

    goToStep(5);
  } catch (err) {
    console.error(err);
    showToast('Install failed: ' + err.message, 'danger');
    btnInstall.disabled = false;
    btnBack.disabled = false;
    setProgress(0, '');
    progressCard.style.display = 'none';
  }
}

// ── HISTORY ───────────────────────────────────────────
function setupHistory() {
  const btnClear = document.getElementById('btn-clear-history');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      state.history = [];
      localStorage.removeItem('ubase_history');
      renderHistory();
      showToast('History cleared.');
    });
  }
}

function renderHistory() {
  const tbody = document.getElementById('history-table-body');
  const empty = document.getElementById('no-history-msg');
  const table = document.getElementById('history-table');
  if (!tbody) return;

  if (state.history.length === 0) {
    empty.style.display = 'block';
    table.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = state.history.map(r => `
    <tr>
      <td>${r.packetName || '—'}</td>
      <td style="font-family:monospace;font-size:12px;">${r.appId || '—'}</td>
      <td>${r.date || '—'}</td>
      <td><span class="badge badge-${r.status === 'success' ? 'success' : 'danger'}">${r.status}</span></td>
    </tr>
  `).join('');
}

// ── SETTINGS ──────────────────────────────────────────
function setupSettings() {
  document.getElementById('btn-save-key').addEventListener('click', () => {
    const key = document.getElementById('api-key-input').value.trim();
    state.apiKey = key;
    localStorage.setItem('ubase_api_key', key);
    showToast('API Key saved!', 'success');
  });

  document.getElementById('btn-test-connection').addEventListener('click', async () => {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key) { showToast('Enter an API key first.', 'danger'); return; }
    const btn = document.getElementById('btn-test-connection');
    btn.disabled = true;
    btn.textContent = 'Testing...';
    try {
      const res = await fetch('https://api.base44.com/api/agents/69fd12da185a6e091e5bea1c', {
        headers: { 'api_key': key }
      });
      showToast(res.ok ? 'Connection successful!' : 'Invalid API key.', res.ok ? 'success' : 'danger');
    } catch {
      showToast('Network error.', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Test Connection';
    }
  });
}

// ── TOAST ─────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
